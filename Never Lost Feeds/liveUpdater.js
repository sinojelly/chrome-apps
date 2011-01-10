var newItemCountLabel = document.getElementById('reading-list-unread-count');
var showNewLabel = document.getElementById('show-new');

if (newItemCountLabel) {
  function requestUpdate() {
    setTimeout(function() {
      var itemCountMatcher = /(\d+)(\+?)/;
      var match = itemCountMatcher.exec(newItemCountLabel.innerHTML);

      var count = 0;
      console.log(newItemCountLabel, match);
      if (!newItemCountLabel.classList.contains('hidden')) {
        count = match[1];
      }
      console.log(newItemCountLabel, match,newItemCountLabel.contains('hidden'),count);
      chrome.extension.sendRequest(
        {
          method: "updateUnreadCount",
          arguments: [
		    -111,
            count,			
            match[2] === '+'
          ]
        }, function(response) {}
      );
    }, 200);
  }

  newItemCountLabel.addEventListener('DOMCharacterDataModified', requestUpdate, true);
  showNewLabel.addEventListener('DOMCharacterDataModified', requestUpdate, true);
  requestUpdate();
}