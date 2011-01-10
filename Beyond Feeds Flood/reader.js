  function Reader() {

  this.baseUrl = 'www.google.com/reader/api/0/';
  this.apis = {
    TOKEN: 'token',

    UNREAD_COUNT: 'unread-count',

    READING_LIST: 'stream/contents/user/-/state/com.google/reading-list',
	
	IMPORTANT_LIST: 'stream/contents/user/-/label/Important',
    
    EDIT_TAG: 'edit-tag',

    MARK_ALL_AS_READ: 'mark-all-as-read'
  }

  this.tags = {
    READ: 'user/-/state/com.google/read',
    STARRED: 'user/-/state/com.google/starred'
  }

  this.matchers = {
    READING_LIST: /user\/[\d]+\/state\/com\.google\/reading-list/,
	IMPORTANT_LIST: /user\/[\d]+\/label\/Important/,
	FEED_LIST: /feed/,
    STARRED_TAG: /user\/[-\d]+\/state\/com\.google\/starred/,
    READER_URL: /https?\:\/\/www.google.com\/reader\/view\//
  }

  // Time in milliseconds that we wait for a  request to complete.
  this.REQUEST_TIMEOUT_MS_ = 30 * 1000; // 30 seconds
  
  this.ITEMS_NUM_IN_PAGE_ = 15;
  
  this.importantCount = 0;
  this.allList = false;

  this.items_;
  this.continuation_ = null;
  this.pageFirstItem_;
  this.timestamp_;

  this.token_;

  // this object holds flags for requests that cannot occur more than once at the same time
  this.requestBusy_ = {
    moveToOlderPage: false
  }
}

Reader.prototype.getApiUrl = function (api) {
    var protocol;
    if(getUseHttps()) {
        protocol = 'https://';
    } else {
        protocol = 'http://';
    }

    return protocol + this.baseUrl + api;
}

Reader.prototype.getReaderUrl = function (api) {
    var protocol;
    if(getUseHttps()) {
        protocol = 'https://';
    } else {
        protocol = 'http://';
    }

    return protocol + 'www.google.com/reader/view/';
}


/*
  Requests a new token (for edit API).
*/
Reader.prototype.refreshToken_ = function (onSuccess, onError) {
  var me = this;

  function handleSuccess(response) {
    me.token_ = response;
    onSuccess();
  }

  this.makeRequest_('http://www.google.com/reader/api/0/token', handleSuccess, onError);
}

/*
  Ensures the existence of a token.
*/
Reader.prototype.ensureToken_ = function (onSuccess, onError) {
  if(!this.token_) {
    this.refreshToken_(onSuccess, onError);
  } else {
    onSuccess();
  }
}

/*
  Make XHR to the specified url.
  onSuccess = function (responseText) {}
  onError = function (opt_isSignedOut) {}
*/
Reader.prototype.makeRequest_ = function(url, onSuccess, onError, opt_method) {
  var xhr = new XMLHttpRequest();

  // use this function to alert that the request-responsecycle is finished
  function markAsFinished(success) {
    if(typeof xhr.onFinished === 'function') {
      xhr.onFinished(success);
    }
  }

  // Initialise timer to abort the operation when no response is returned after certain amount of time.
  var abortTimerId = window.setTimeout(function() {
    xhr.abort();
    handleError();
  }, this.REQUEST_TIMEOUT_MS_);


  function handleError(opt_isSignedOut) {
    window.clearTimeout(abortTimerId);
    onError(opt_isSignedOut);
    markAsFinished(false);
  }

  function handleSuccess(response) {
    window.clearTimeout(abortTimerId);
    onSuccess(response);
    markAsFinished(true);
  }
  
  try {
    // log request: format to keep console clean 
    console.groupCollapsed('Reader: request');
    console.log(url);
    console.groupEnd();

    xhr.onreadystatechange = function(){
      if (xhr.readyState === 4) {
        if (xhr.status >= 400) {
          console.error('Reader: response: ' + xhr.status + '/' + xhr.statusText);

          handleError(xhr.status === 401);
        } else if (xhr.responseText) {     
          // log response: format to keep console clean    
          console.groupCollapsed('Reader: response');
          console.log(xhr.responseText);
          console.groupEnd();

          handleSuccess(xhr.responseText)
        } else {
          console.error('Reader: No responseText!');

          handleError();
        }
      }
    }

    xhr.onerror = function(error) {
      console.error('XHR error: ' + error);
      handleError();
    }

    var method = opt_method || 'GET';

    xhr.open(method, url, true);
    xhr.send(null);
  } catch(e) {
    console.error('XHR exception: ' + e);
    handleError();
  }
}

/*
  Handle requests with Json responses.
  onSuccess = function (responseJson) {}
  onError = function (opt_isSignedOut) {}
*/
Reader.prototype.makeJsonRequest_ = function (url, onSuccess, onError, opt_method) {  
  function handleSuccess(jsonText) {    
    var json;

    try {
      json = JSON.parse(jsonText);
    } catch (e) {
      console.error('JSON parse exception: ' + e);

      onError();
      return;
    }

    onSuccess(json);
  }

  this.makeRequest_(url, handleSuccess, onError, opt_method);
}

/*
  Removes the item with id from the page itemlist (makes no request).
*/
Reader.prototype.removeItemLocal_ = function (id) {
  for(var i = 0; i < this.items_.length; i++) {
    if(this.items_[i].id === id) {
      this.items_.splice(i, 1);
    }
  }
}

/*
  Removes tags from item id (makes no request). Uses a regular expression to locate the tag
*/
Reader.prototype.removeTagLocal_ = function (id, matcher) {
  for(var i = 0; i < this.items_.length; i++) {
    var item = this.items_[i];
    if(item.id === id) {
      for(var j = 0; j < item.categories.length; j++) {
        if(matcher.test(item.categories[j])) {
          item.categories.splice(j, 1);
          j--; // put index one step back to make up for removed item
        }
      }
    }
  }
}

/*
  Add the tag to item id (makes no request).
*/
Reader.prototype.addTagLocal_ = function (id, tag) {
  for(var i = 0; i < this.items_.length; i++) {
    if(this.items_[i].id === id) {
      this.items_[i].categories.push(tag);
    }
  }
}

/*
  transforms an object into a string of url parameters
  ex: buildQueryStringParameters_({a:1, b:'abc'}) = 'a=1&b=abc'
*/
Reader.prototype.buildQueryStringParameters_ = function (params) {
  var paramStrings = [];
  for(prop in params) {
    if(params.hasOwnProperty(prop)){
      paramStrings.push(prop + "=" + params[prop]);
    }
  }
  return paramStrings.join('&');
}

/*
  Requests the unread count
  onSuccess = function (count, isMax) {}
  onError = function (opt_isSignedOut) {}
*/
Reader.prototype.getUnreadCount = function (onSuccess, onError) {
  var me = this;

  var url = this.getApiUrl(this.apis.UNREAD_COUNT) + '?' + this.buildQueryStringParameters_({
    output: 'json',
    refresh: true,
    client: 'chromenotifier'
  });

  this.makeJsonRequest_(url,
    function(response) {
      var totalCount = 0;
	  var importantCount = 0;
      var isMax = false;
      for (var i = 0, stream; stream = response.unreadcounts[i]; i++) {	  
		if (me.matchers.FEED_LIST.test(stream.id)) {
          totalCount += stream.count;          
		  if (stream.count >= response.max)
		  {
		      isMax = true;
		  }
		  continue;
        }
		
		if (me.matchers.IMPORTANT_LIST.test(stream.id)) {
          importantCount = stream.count;          
        }		
      }	  
	  if (importantCount <= 0)
	  {
	      me.allList = true;
	  }
	  else
	  {
	      me.allList = false;
	  }
	  me.importantCount = importantCount;
      onSuccess(importantCount, totalCount, isMax);
    },
    onError
  );
};

/*
  Requests the unread items
  onSuccess = function (items) {}
  onError = function (opt_isSignedOut) {}
*/
Reader.prototype.getUnreadItems_ = function (onSuccess, onError, opt_continuation) {
  var me = this;

  var queryParams = {
    output: 'json',
    xt: this.tags.READ,
    n: getMaxItemCount() + 1, // prefs (+1 to ensure no continuation when exactly max items)
    client: 'module'
  };
  
  if(opt_continuation) {
    queryParams.c = opt_continuation;
  }

  var url;
  if (me.allList)
  {
    url = this.getApiUrl(this.apis.READING_LIST) + '?' + this.buildQueryStringParameters_(queryParams);
  }
  else
  {
    url = this.getApiUrl(this.apis.IMPORTANT_LIST) + '?' + this.buildQueryStringParameters_(queryParams);
  }

  function handleSuccess(response) {
    me.continuation_ = response.continuation;
    me.timestamp_ = new Date(); // use client time in stead of server time: 'new Date(response.updated*1000)'

    onSuccess(response.items);
  }

  this.makeJsonRequest_(url, handleSuccess, onError);
}

/*
  Confirms there are enough items in the list for the current page and fills up if necessary
  onSucces = function () { };
  onError = function (opt_isSignedOut) { }; 
*/
Reader.prototype.ensureItems_ = function(onSuccess, onError) {
  var me = this;

  if(this.pageFirstItem_ + this.ITEMS_NUM_IN_PAGE_ > this.items_.length && this.continuation_) {
    // fetch new items for the list    

    var handleSucces = function (newItems) { 
      me.items_ = me.items_.concat(newItems);
      onSuccess();
    };

    this.getUnreadItems_(handleSucces, onError, this.continuation_);
  } else {
    onSuccess();
  }
}

/*
  Determines wether there are more items before the current page.
*/
Reader.prototype.hasNewerItems = function () {
  return this.pageFirstItem_ > 0;
}

/*
  Determines wether there are more items after the current page.
*/
Reader.prototype.hasOlderItems = function () {
  return this.items_.length > 0;
  //return this.continuation_ !== undefined || this.items_.length > this.pageFirstItem_ + getMaxItemCount();
}

/*
  Moves the reader to a newer page.
  onSucces = function () { };
  onError = function (opt_isSignedOut) { }; 
*/
Reader.prototype.moveToNewerPage = function (onSuccess, onError) {
  if(this.hasNewerItems()) {
    this.pageFirstItem_ = Math.max(this.pageFirstItem_ - this.ITEMS_NUM_IN_PAGE_, 0);
    onSuccess();
  } else {
    onError();
  }
}

/*
  Moves the reader to an older page. This request can only be executed one at a time.
  Otherwise the itemslist could be fillid multiple times with the same data.
  TODO: implement this with a queue so the user can click the olderitems button multiple times
  to move through pages more quicly.
  onSucces = function () { };
  onError = function (opt_isSignedOut) { }; 
*/
Reader.prototype.moveToOlderPage = function (onSuccess, onError) {
  var me = this;

  function handleSuccess() {
    onSuccess();
    me.requestBusy_.moveToOlderPage = false;
  }

  function handleError() {
    onError();
    me.requestBusy_.moveToOlderPage = false;
  }
  
  if(this.hasOlderItems() && !this.requestBusy_.moveToOlderPage) {
    this.requestBusy_.moveToOlderPage = true;

    this.pageFirstItem_ += this.ITEMS_NUM_IN_PAGE_;
    this.ensureItems_(handleSuccess, handleError);
  } else {
    handleError();
  }
}

/*
  Gets the items of the current page.
*/
Reader.prototype.getCurrentPage = function () {
  var page = this.items_.slice(this.pageFirstItem_, this.pageFirstItem_ + this.ITEMS_NUM_IN_PAGE_);
  return [page, this.allList];
}

/*
  Refresh the reader
  onSucces = function () { };
  onError = function (opt_isSignedOut) { }; 
*/
Reader.prototype.refresh = function (onSuccess, onError) {
  var me = this;

  var handleSucces = function (newItems) {
    me.items_ = newItems;
    me.pageFirstItem_ = 0;

    onSuccess();
  };

  this.getUnreadItems_(handleSucces, onError);
}

/*
  Adds a tag to a feed item.
  onSucces = function () { };
  onError = function (opt_isSignedOut) { }; 
*/
Reader.prototype.addTag_ = function (id, tag, onSuccess, onError) { // TODO: handle expired token!
  var me = this;
  
  // do editing of the tag (add tag)
  function doEditTag() {
    var url = me.getApiUrl(me.apis.EDIT_TAG) + '?' + me.buildQueryStringParameters_({
      output: 'json',
      a: tag,
      i: id,
      T: me.token_
    });

    me.makeRequest_(url, onSuccess, onError, 'POST');
  }
  
  // get a token first if necessary
  this.ensureToken_(doEditTag, onError);
}

/*
  Removes a tag from a feed item.
  onSucces = function () { };
  onError = function (opt_isSignedOut) { }; 
*/
Reader.prototype.removeTag_ = function (id, tag, onSuccess, onError) { // TODO: handle expired token!
  var me = this;
  
  // do editing of the tag (add tag)
  function doEditTag() {
    var url = me.getApiUrl(me.apis.EDIT_TAG) + '?' + me.buildQueryStringParameters_({
      output: 'json',
      r: tag,
      i: id,
      T: me.token_
    });

    me.makeRequest_(url, onSuccess, onError, 'POST');
  }
  
  // get a token first if necessary
  this.ensureToken_(doEditTag, onError);
}

/*
  Marks the item with id as read and removes it from the page
  onSucces = function () { };
  onError = function (opt_isSignedOut) { }; 
*/
Reader.prototype.markAsReadAndRefreshPage = function (id, onSuccess, onError) {
  var me = this;

  // to execute when 'read' label was added successfully
  function handleSuccess() {
    me.removeItemLocal_(id);
    me.ensureItems_(onSuccess, onError);
  }

  me.addTag_(id, me.tags.READ, handleSuccess, onError);
}

Reader.prototype.markAsRead = function (id, onSuccess, onError) {
  var me = this;

  me.addTag_(id, me.tags.READ, function (){}, onError);
}

/*
  Returns wether the item is starred
*/
Reader.prototype.isStarred = function (item) {
  for(var i = 0, len = item.categories.length; i < len; i++) {
    if(this.matchers.STARRED_TAG.test(item.categories[i])) {
      return true;
    }
  }
  return false;
}

/*
  Star item. Dissallow multiple requests of this type to avoid adding more than one label
  onSucces = function () { };
  onError = function (opt_isSignedOut) { }; 
*/
Reader.prototype.starItem = function (id, onSuccess, onError) {
  var me = this;

  function handleSuccess() {
    // add it te the page so it can be displayed without reloading the items
    me.addTagLocal_(id, me.tags.STARRED);
    onSuccess();
  }

  me.addTag_(id, this.tags.STARRED, handleSuccess, onError);
}

/*
  Unstar item
  onSucces = function () { };
  onError = function (opt_isSignedOut) { }; 
*/
Reader.prototype.unstarItem = function (id, onSuccess, onError) {
  var me = this;

  function handleSuccess() {
    // remove it from the page so it can be displayed without reloading the items
    me.removeTagLocal_(id, me.matchers.STARRED_TAG);
    onSuccess();
  }

  this.removeTag_(id, me.tags.STARRED, handleSuccess, onError);
}

Reader.prototype.getLastUpdateTimestamp = function () {
  return this.timestamp_;
}

Reader.prototype.markAllAsRead = function (onSuccess, onError) {
  var me = this;

  function handleSuccess() {
    me.items_ = [];
    onSuccess();
  }

  function doMarkAsRead() {
    var url = me.getApiUrl(me.apis.MARK_ALL_AS_READ) + '?' + me.buildQueryStringParameters_({
      s: 'user/-/state/com.google/reading-list',
      T: me.token_
    });

    me.makeRequest_(url, handleSuccess, onError, 'POST');
  }

  this.ensureToken_(doMarkAsRead, onError);
}