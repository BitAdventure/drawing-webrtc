import { createClient } from "redis";

export type RedisClient = ReturnType<typeof createClient>;

export const redisOptions = {
  url: process.env.REDIS_URL || "redis://localhost:6379",
  // Other Redis client options can be added here
};

export const initializeRedisClient = async () => {
  const redisClient = createClient(redisOptions);

  await redisClient.connect();

  return redisClient;
};
