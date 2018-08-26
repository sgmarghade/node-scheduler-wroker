'use strict';
const fs = require('fs');
const path = require('path');
const Promise = require('bluebird');
const schedule = require('node-schedule');
const EventDispatcher = require('./src/event-managers/event-dispatcher');

let schedulerFiles = __dirname + '/src/schedulers';

const dispatcher = new EventDispatcher();
dispatcher.init()
  .then(() => {
    fs.readdir(schedulerFiles, function (err, files) {

      let pending = [];

      for (let i = 0; i < files.length; i++) {
        // only include .js files
        if (!files[i].match(/\.js$/)) {
          continue;
        }

        let file = path.join(schedulerFiles, files[i]);
        let scheduler = require(file)(dispatcher);

        pending.push(schedule.scheduleJob(scheduler.rule, scheduler.task));
      }

      console.log('Scheduling all schedulers.');

      return Promise.all(pending);
    });


  });


