// src/notification/notification.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationResolver } from './notification.resolver';
import { MongooseModule } from '@nestjs/mongoose';
import { Notification, NotificationSchema } from './entities/notification.entity';
import { EmailModule } from '../email/email.module';
import { RabbitMQModule } from 'src/rabbitMq/rabbitmq.module';
import { PubSub } from 'graphql-subscriptions';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
    ]),
    forwardRef(() => RabbitMQModule),
    EmailModule,
    
  ],
  providers: [NotificationService, NotificationResolver,
    {
      provide: 'PUB_SUB',
      useValue: new PubSub(),
    },
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
