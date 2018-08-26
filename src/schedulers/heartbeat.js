const Promise = require('bluebird');
const events = require('../queue-event/events');

module.exports = (eventDispatcher) => {
  return {
    task: function () {
      console.log('Pushing heartbeat to queue. This will be consumed by Worker');
      Promise.map([...Array(100000)], () => {
        return eventDispatcher.dispatch(events.HEARTBEAT.exchange, {message: 'Welcome to world of scheduler and worker'});
      }, {concurrency: 2000})
        .then(() => {
          return Promise.resolve();
        });
    },

    rule: "*/10 * * * * *",
  };
}