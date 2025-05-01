// rabbitmq.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { UserCacheService } from './user-cache.service';
import { RabbitMQConsumer } from './rabbitmq.consumer';
import { RabbitMQService } from './rabbitmq.service';
import { NotificationModule } from 'src/notification/notification.module'; 

@Module({
  imports: [ forwardRef(() => NotificationModule),], 
  providers: [
    UserCacheService,
    RabbitMQConsumer,
    RabbitMQService,
  ],
  exports: [UserCacheService, RabbitMQService],
})
export class RabbitMQModule {}
