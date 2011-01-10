var CLICK_BEHAVIOR_KEY = 'click-behavior';
var OPEN_READER_BEHAVIOR_KEY = 'openreader-behavior';
var REFRESH_INTERVAL_KEY = 'refresh-interval';
var MAX_ITEMCOUNT_KEY = 'max-itemcount';
var USE_HTTPS_KEY = 'use-https';
var ENABLE_ICON_ANIMATION_KEY = 'enable-icon-animation';

(function ensureDefaults() {
  if(localStorage[ENABLE_ICON_ANIMATION_KEY] === undefined) {
    setEnableIconAnimation(true);
  }
})();

function getClickBehavior() {
  return localStorage[CLICK_BEHAVIOR_KEY] || 'popup';
}

function setClickBehavior(value) {
  localStorage[CLICK_BEHAVIOR_KEY] = value;
}

function getRefreshInterval() {
  return parseInt(localStorage[REFRESH_INTERVAL_KEY] || '300000', 10);
}

function setRefreshInterval(value) {
  localStorage[REFRESH_INTERVAL_KEY] = value;
}

function getMaxItemCount() {
  return parseInt(localStorage[MAX_ITEMCOUNT_KEY] || '15', 10);
}

function setMaxItemCount(value) {
  localStorage[MAX_ITEMCOUNT_KEY] = value;
}

function getUseHttps() {
  return (localStorage[USE_HTTPS_KEY] === 'true');
}

function setUseHttps(value) {
  localStorage[USE_HTTPS_KEY] = value;
}

function getEnableIconAnimation() {
  return (localStorage[ENABLE_ICON_ANIMATION_KEY] === 'true');
}

function setEnableIconAnimation(value) {
  localStorage[ENABLE_ICON_ANIMATION_KEY] = value;
}

function getOpenReaderBehavior() {
  return localStorage[OPEN_READER_BEHAVIOR_KEY] || 'newtab';
}

function setOpenReaderBehavior(value) {
  localStorage[OPEN_READER_BEHAVIOR_KEY] = value;
}