const amqplib = require('amqplib');
const changeCase = require('change-case');
const Promise = require('bluebird');
const fs = require('fs');
const path = require('path');
const config = require('../../config');

function WorkerBuilder() {
  this.connection = null;
  this.channel = null;
  this.runners = {};
}

WorkerBuilder.prototype.init = function () {
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
      return self.loadRunners();
    }).then(function () {
      console.log('info', 'Loaded runners OK');
      return self.createQueues();
    })
    .then(function () {
      console.log('Created queues OK');
    });
}


WorkerBuilder.prototype.loadRunners = function () {

  var self = this;

  // set up connection
  console.log('Loading Runners');

  return new Promise(function (resolve, reject) {
    let pathDirectory = __dirname + '/runners';
    fs.readdir(pathDirectory, function (err, files) {
      let pending = [];
      let runner;
      let runnerName;
      let file;
      let stripExtension;

      if (err) {
        reject(err);
        return;
      }

      stripExtension = function (file) {
        return file.substring(0, file.indexOf('.'));
      };

      for (let i = 0; i < files.length; i++) {
        // only include .js files
        if (!files[i].match(/\.js$/)) {
          continue;
        }

        file = path.join(pathDirectory, files[i]);
        runner = require(file);
        runnerName = changeCase.constantCase(stripExtension(files[i]));
        self.runners[runnerName] = runner;
      }

      return Promise.all(pending)
        .then(function () {
          resolve(self.runners);
        }, reject);
    });
  });
}



WorkerBuilder.prototype.createQueues = function () {
  var self = this;

  var pending = [];

  var assertQueue = function (queueName) {
    console.log('Asserting queue ', queueName);

    return self.channel.assertQueue(queueName, {
      deadLetterExchange: 'FAILED_TASKS',
      durable: true,
      autoDelete: false
    })
      .then(function () {
        console.log('info', 'Asserted queue  OK', queueName);
      }, function (err) {
        console.log('error', 'Could not create queue ', queueName);
        console.log('error', err);
        return Promise.reject(err);
      });
  };

  for (let queueName in self.runners) {
    pending.push(assertQueue(queueName));
  }

  return Promise.all(pending)
    .then(function () {
      console.log('info', 'Created queues OK');
    }, function (err) {
      return Promise.reject(err);
    });
};


WorkerBuilder.prototype.run = function () {
  var self = this;

  //Maximum unack messages in channel.
  self.channel.prefetch(config.rabbitmq.prefetchCount);

  for (let queueName in self.runners) {
    self.channel.consume(queueName, self.generateCallback(queueName, self.runners[queueName]), {
      noAck: false
    });
  }
};

WorkerBuilder.prototype.generateCallback = function (queueName, runner) {
  var self = this;

  return function (msg) {

    //Innner function
    var deserialize = function (message) {
      return new Promise(function (resolve, reject) {
        var taskData;
        try {
          console.log('debug', 'Deserializing task ', queueName);

          taskData = JSON.parse(message.content.toString());

          if (!taskData.name) {
            console.log('debug',
              'Deserialized task has no `name` property; assigning queue name as name of task');
            taskData.name = queueName;
          }

          resolve(taskData);
        } catch (err) {
          reject(err);
        }
      });
    };

    deserialize(msg)
      .then(function (task) {

        console.log('info', 'Deserialized task OK', task);

        return runner(task)
          .then(function () {
            // TODO: add unit test to validate that this works
            console.log('info', 'Processed OK; TASK WITH NAME  ', queueName);
            self.channel.ack(msg);
          },function (err) {
            console.log(err);
            // don't return rejection since we will handle it with nack'ing
            console.log('warn', 'Message will be nack\'d and sent to DLQ: ', task, {});
            // do not requeue
            self.channel.nack(msg, null, false);
          });

      })
      .catch((err) => {
        console.log('Failed to process for queue:  , message: ',
          queueName, msg.content.toString());
        console.log(err);
        self.channel.nack(msg, null, false);
      })
  };
}


module.exports = WorkerBuilder;