# node-scheduler-wroker
#### Implementing Node Scheduler and Worker with RabbitMq.

This is classic example of Scheduler and Worker implementation using NodeJs and RabbitMq.

Worker is highly scalable and can consume up to 10k Events/instance, with scope to scale horizontally.  

You will have to adjust prefetch count for worker as per need. 

## Setup Instructions.

1. Setup RabbitMq as per your system. 
2. Git clone this project 
    * `git clone https://github.com/sgmarghade/node-scheduler-wroker.git`
    * `npm install`
3. To run scheduler 
    * `node Scheduler.js`
4. To run worker
    * `node Worker.js`
    
### These are some of the stats from single node machine. 

With only worker running.
![Only Worker Running](/images/only-worker-running.png)

With Schedulers and Sindle worker running 
![Worker And Scheduler Running](/images/worker-scheduler.png)

 
