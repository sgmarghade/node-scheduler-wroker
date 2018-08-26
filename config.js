module.exports = {
  rabbitmq: {
    amqpUri: process.env.RABBITMQ_AMQP_URI || 'amqp://guest:guest@localhost:5672/%2f'
  }
}