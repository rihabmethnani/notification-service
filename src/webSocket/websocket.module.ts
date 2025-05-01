// src/websocket/websocket.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { WebSocketService } from './websocket.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
    imports: [forwardRef(() => NotificationModule)],
    providers: [WebSocketService],
  exports: [WebSocketService],
})
export class WebSocketModule {}