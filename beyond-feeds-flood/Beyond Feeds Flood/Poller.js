function Poller () {
  this.pollingTime_ = 1000;
  this.pollTimer_ = 0;
}

Poller.prototype.scheduleNextPoll_ = function (onPoll) {
  if(this.pollTimer_) {
    window.clearTimeout(this.pollTimer_)
  }
  this.pollTimer_ = 0;

  var timerInstance = this;

  this.pollTimer = window.setTimeout(function () { 
    onPoll(timerInstance);
    timerInstance.scheduleNextPoll_(onPoll);
  }, this.pollingTime_);
}

Poller.prototype.startPolling = function(onPoll, opt_pollingTime) {
  onPoll(this);
  
  if(opt_pollingTime) {
    this.setPollingTime(opt_pollingTime);
  }
  
  this.scheduleNextPoll_(onPoll)  
}

Poller.prototype.setPollingTime = function(pollingTime) {
  this.pollingTime_ = pollingTime;
  console.log('next poll in ' + this.pollingTime_ + 'ms');
}

Poller.prototype.stopPolling = function() {
  if(this.pollTimer_) {
    window.clearTimeout(this.pollTimer_)
  }
  this.pollTimer_ = 0;
}