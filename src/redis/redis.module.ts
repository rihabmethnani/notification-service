// app.module.ts
import { Module } from '@nestjs/common';
import { RedisPubSubProvider } from './redis-pubsub.provider';

@Module({
  providers: [RedisPubSubProvider],
  exports: [RedisPubSubProvider],
})
export class RedisModule {}