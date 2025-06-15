// rabbitmq.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { UserCacheService } from './user-cache.service';
import { RabbitMQConsumer } from './rabbitmq.consumer';
import { RabbitMQService } from './rabbitmq.service';
import { NotificationModule } from 'src/notification/notification.module'; 
import { EmailModule } from 'src/email/email.module';

@Module({
  imports: [ forwardRef(() => NotificationModule),
    forwardRef(() => EmailModule),
  ], 
  providers: [
    UserCacheService,
    RabbitMQConsumer,
    RabbitMQService,
    
  ],
  exports: [UserCacheService, RabbitMQService],
})
export class RabbitMQModule {}
