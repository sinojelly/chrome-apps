var closeSettingsLink = document.getElementById('close-settings-link');

if (closeSettingsLink) {
  closeSettingsLink.innerText = 'Back to Reader Notifier settings';
  closeSettingsLink.addEventListener('click', function () {
    window.location = chrome.extension.getURL('options.html');
  }, true);
}