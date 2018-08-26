const events = require('../queue-event/events');
module.exports = (eventDispatcher) => {
  return {
    task: function () {
      console.log('Pushing heartbeat to queue. This will be consumed by Worker');
      return eventDispatcher.dispatch(events.HEARTBEAT.exchange, {message: 'Welcome to world of scheduler and worker'});
    },

    rule: "*/5 * * * * *",
  };
}