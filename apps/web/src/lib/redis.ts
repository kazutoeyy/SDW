import Redis from 'ioredis';

// Luu ioredis instance de de dang hot reload trong dev
declare global {
    // eslint-disable-next-line no-var
    var redisGlobalPool: Redis | undefined;
}

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

/**
 * Singleton Redis de thuc hien cache giua cac requests va luu do thi
 */
export const redisParams = {
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
};

export const redis =
    global.redisGlobalPool || new Redis(redisUrl, redisParams);

if (process.env.NODE_ENV !== 'production') {
    global.redisGlobalPool = redis;
}

// Log error connection
redis.on('error', (err) => {
    console.error('Loi ket noi Redis:', err);
});
