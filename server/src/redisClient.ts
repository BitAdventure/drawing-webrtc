import { createClient } from "redis";

export type RedisClient = ReturnType<typeof createClient>;

export const initializeRedisClient = async () => {
  const redisClient = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
    // Other Redis client options can be added here
  });

  await redisClient.connect();

  return redisClient;
};
