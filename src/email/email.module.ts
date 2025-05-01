// src/email/email.module.ts
import { Module } from '@nestjs/common';
import { MailService } from './email.service';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Notification, NotificationSchema } from 'src/notification/entities/notification.entity';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
    ]),
  ],  providers: [MailService],
  exports: [MailService],
})
export class EmailModule {}