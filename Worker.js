const WorkerBuilder = require('./src/workers/worker-builder');

let workerBuilder = new WorkerBuilder();
workerBuilder.init().then(() => {
  workerBuilder.run();
})