/*
  top level object to interact with the extension action button
*/
function ReaderNotifier() {
  this.iconSources = {
    signedOut: [
      'images/button/signed-out-1.png',
      'images/button/signed-out-2.png',
      'images/button/signed-out-3.png',
      'images/button/signed-out-4.png',
      'images/button/signed-out-5.png',
      'images/button/signed-out-6.png',
      'images/button/signed-out-7.png'
    ],
    signedIn: [
      'images/button/signed-in-1.png',
      'images/button/signed-in-2.png',
      'images/button/signed-in-3.png',
      'images/button/signed-in-4.png',
      'images/button/signed-in-5.png',
      'images/button/signed-in-6.png',
      'images/button/signed-in-7.png'
    ],
    unreadItems: [
      'images/button/unread-items-1.png',
      'images/button/unread-items-2.png',
      'images/button/unread-items-3.png',
      'images/button/unread-items-4.png',
      'images/button/unread-items-5.png',
      'images/button/unread-items-6.png',
      'images/button/unread-items-7.png'
    ]
  }

  this.currentIconSource = this.iconSources.signedOut;
  this.unreadCount = 0;
  this.animation;
  this.frame = 0;
  this.stopAnimation = false;
}

/*
  renders the action button according to the current state
*/
ReaderNotifier.prototype.renderBrowserAction = function() {
console.log('render', this);
  if(!this.animation) {
    // don't render the icon, the animation is already rendering the icon
    chrome.browserAction.setIcon({path: this.currentIconSource[0]});
  }
  
  chrome.browserAction.setBadgeText({text: (this.unreadCount <= 0 ? '' : String(this.unreadCount)) });
}

ReaderNotifier.prototype.setUnreadCount = function (count) {
  this.unreadCount = count;
  if(count < 0) {
    this.currentIconSource = this.iconSources.signedOut;
  } else if(count > 0) {
    this.currentIconSource = this.iconSources.unreadItems;
  } else {
    this.currentIconSource = this.iconSources.signedIn;
  }
}

/*
  start the loading animation.
*/
ReaderNotifier.prototype.startLoadingAnimation = function() {  
  var me = this;

  me.stopAnimation = false;
  this.frame = 0;
  
  function showNextFrame() {
    me.frame = (me.frame + 1) % me.currentIconSource.length;
    chrome.browserAction.setIcon({path: me.currentIconSource[me.frame]});

    if(me.frame === 0 && me.stopAnimation) {
      clearInterval(me.animation);
      me.animation = undefined;
    }
  }
  
  if(getEnableIconAnimation()) {
    if(!this.animation) {
      this.animation = setInterval(showNextFrame, 75);  
    }
  }
}

/*
  stop the loading animation.
*/
ReaderNotifier.prototype.stopLoadingAnimation = function() {
  this.stopAnimation = true;
}