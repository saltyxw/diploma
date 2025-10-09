const { createClient } = require('redis');

const redisClient = createClient();

redisClient.on('error', err => console.error('Redis Client Error', err));

async function connectRedis() {
    try {
        await redisClient.connect();
        console.log('Connected to Redis');
    } catch (err) {
        console.error('Redis connection error:', err);
        process.exit(1);
    }
}

module.exports = { redisClient, connectRedis };
