// src/notification/notification.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationResolver } from './notification.resolver';
import { MongooseModule } from '@nestjs/mongoose';
import { Notification, NotificationSchema } from './entities/notification.entity';
import { EmailModule } from '../email/email.module';
import { RabbitMQModule } from 'src/rabbitMq/rabbitmq.module';
import { WebSocketModule } from 'src/webSocket/websocket.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
    ]),
    forwardRef(() => RabbitMQModule),
    EmailModule,
    forwardRef(() => WebSocketModule),
  ],
  providers: [NotificationService, NotificationResolver],
  exports: [NotificationService],
})
export class NotificationModule {}
