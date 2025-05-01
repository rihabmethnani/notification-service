// redis-pubsub.provider.ts
import { Redis } from 'ioredis';
import { RedisPubSub } from 'graphql-redis-subscriptions';

export const REDIS_PUBSUB = 'REDIS_PUBSUB';

export const RedisPubSubProvider = {
  provide: REDIS_PUBSUB,
  useFactory: () => {
    return new RedisPubSub({
      publisher: new Redis(process.env.REDIS_URL || 'redis://localhost:6379'),
      subscriber: new Redis(process.env.REDIS_URL || 'redis://localhost:6379'),
    });
  },
};