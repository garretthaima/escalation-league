const Redis = require('ioredis');
const path = require('path');
const envFile = process.env.NODE_ENV === 'production'
    ? path.resolve(__dirname, '../.env.prod') // Adjust the path to the actual location of .env.prod
    : path.resolve(__dirname, '../.env.dev'); // Adjust the path to the actual location of .env.dev

console.log('Loaded .env file:', envFile);
// Create a Redis client instance
const redis = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1', // Redis server host
    port: process.env.REDIS_PORT || 6379,       // Redis server port
    password: process.env.REDIS_PASSWORD || null, // Optional password for Redis
    db: process.env.REDIS_DB || 0,             // Redis database index (default is 0)
});

redis.on('connect', () => {
    console.log('Connected to Redis');
});

redis.on('error', (err) => {
    console.error('Redis connection error:', err);
});

module.exports = redis;