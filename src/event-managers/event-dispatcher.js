'use strict';
const amqplib = require('amqplib');
const Promise = require('bluebird');
const errors = require('common-errors');
const moment = require('moment');
const config = require('../../config');
const events = require('./events');

function EventDispatcher() {
  this.connection = null;
  this.channel = null;
}

EventDispatcher.prototype.init = function() {
  let self = this;
  return amqplib.connect(config.rabbitmq.amqpUri)
    .then((connection) => {
      console.log('Created connection successfully');

      self.connection = connection;
      return self.connection.createChannel();
    })
    .then((channel) => {
      console.log('Created channel successfully');
      self.channel = channel;
      return self.channel.assertExchange('FAILED_TASKS', 'fanout');
    })
    .then(() => {
      console.log('Created FAILED_TASKS exchange.');
      return self.channel.assertQueue('FAILED_TASKS', {
        durable: true,
        autoDelete: false
      });
    })
    .then(() => {
      console.log('Created FAILED_TASK Queue successfully');
      return self.channel.bindQueue('FAILED_TASKS', 'FAILED_TASKS');
    })
    .then(() => {
      console.log('Created FAILED_TASKS binding.');
      return self.assertExchangesAndQueues();
    })
    .then(function () {
      console.log('Created queues OK');
    })
}

EventDispatcher.prototype.assertExchangesAndQueues = function () {
  let self = this;
  return Promise.each((Object.keys(events)), (exchange) => {
    console.log('Asserting exchange ',exchange);
    return self.channel.assertExchange(exchange)
      .then(() => {
        return Promise.each((events[exchange].queues), (queueName) => {
          console.log('Asserting queue ', queueName);

          return self.channel.assertQueue(queueName, {
            deadLetterExchange: 'FAILED_TASKS',
            durable: true,
            autoDelete: false,
          })
            .then(() => {
              console.log('Binding queue  to exchange ', queueName, exchange);
              return self.channel.bindQueue(queueName, exchange);
            })
        });
      });
  });
};

//EventName = Exchange Name
EventDispatcher.prototype.dispatch = function (eventName, data) {
  let event = events[eventName];
  if(!event) {
    throw errors.NotPermittedError('Event with name '+eventName + ' not found');
  }

  console.log('Sending event ', eventName, data);

  let queuePayload = {
    createdAt: moment().format(),
    name: eventName,
    properties: data
  };

  let publish = this.channel.publish(eventName, '', new Buffer(JSON.stringify(queuePayload)));
  return publish;
};

module.exports = EventDispatcher;