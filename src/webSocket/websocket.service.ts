import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { OnModuleInit } from '@nestjs/common/interfaces';
import { Server, Socket } from 'socket.io';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { NotificationService } from '../notification/notification.service';

@WebSocketGateway({
  cors: {
    origin: '*',  
  },
  namespace: '/notifications', 
})
export class WebSocketService implements OnModuleInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketService.name);
  private readonly connectedClients = new Map<string, Socket>();

  constructor( @Inject(forwardRef(() => NotificationService))
  private readonly notificationService: NotificationService,) {}

  onModuleInit() {
    this.server.on('connection', (socket) => {
      const userId = socket.handshake.query.userId as string;
      
      if (!userId) {
        socket.disconnect(true);
        return;
      }

      this.connectedClients.set(userId, socket);
      this.logger.log(`Client connected: ${userId}`);

      // Envoyer les notifications non lues au moment de la connexion
      this.sendUnreadNotificationsOnConnection(userId);

      socket.on('disconnect', () => {
        this.connectedClients.delete(userId);
        this.logger.log(`Client disconnected: ${userId}`);
      });

      socket.on('markAsRead', async (notificationId: string) => {
        await this.notificationService.markAsRead(notificationId);
      });
    });
  }

  async sendUnreadNotificationsOnConnection(userId: string) {
    try {
      const unreadNotifications = await this.notificationService.getUserNotifications(
        userId,
      );
      
      const socket = this.connectedClients.get(userId);
      
      if (socket && unreadNotifications.length > 0) {
        socket.emit('initialUnreadNotifications', {
          count: unreadNotifications.length,
          notifications: unreadNotifications
        });
      }
    } catch (error) {
      this.logger.error(`Error sending unread notifications to user ${userId}:`, error);
    }
  }

  async sendNotification(userId: string, payload: any) {
    try {
      const socket = this.connectedClients.get(userId);
      if (socket) {
        socket.emit('newNotification', payload);
        this.logger.debug(`Notification sent to user ${userId}`);
      } else {
        this.logger.warn(`User ${userId} is not connected via WebSocket`);
      }
    } catch (error) {
      this.logger.error(`Error sending notification to user ${userId}:`, error);
    }
  }
}