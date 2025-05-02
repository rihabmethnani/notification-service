import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from './entities/notification.entity';
import { CreateNotificationInput } from './dto/create-notification.dto';
import { Role } from './enums/Role.enum';
import { MailService } from 'src/email/email.service';
import { UserCacheService } from 'src/rabbitMq/user-cache.service';
import { PubSub } from 'graphql-subscriptions';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    private readonly userCacheService: UserCacheService,
    private readonly mailService: MailService,
    @Inject('PUB_SUB') private readonly pubSub: PubSub,
  ) {}
  async create(
    createNotificationInput: CreateNotificationInput,
  ): Promise<NotificationDocument> {
    const createdNotification = new this.notificationModel({
      ...createNotificationInput,
      userId: new Types.ObjectId(createNotificationInput.userId),
    });

    const savedNotification = await createdNotification.save();
    
    // Publier la notification via GraphQL Subscription
    await this.pubSub.publish('notificationAdded', {
      notificationAdded: savedNotification.toObject(),
      userId: createNotificationInput.userId
    });

    return savedNotification;
  }

  async findAllForUser(userId: string): Promise<NotificationDocument[]> {
    return this.notificationModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getUnreadNotifications(userId: string): Promise<NotificationDocument[]> {
    return this.notificationModel
      .find({ 
        userId: new Types.ObjectId(userId),
        read: false
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async markAsRead(notificationId: string): Promise<NotificationDocument> {
    const updatedNotification = await this.notificationModel.findByIdAndUpdate(
      notificationId,
      { read: true, readAt: new Date() },
      { new: true },
    ).exec();
  
    if (!updatedNotification) {
      throw new Error(`Notification with ID ${notificationId} not found`);
    }
  
    return updatedNotification;
  }

  async markAllAsRead(userId: string): Promise<boolean> {
    const result = await this.notificationModel.updateMany(
      { userId: new Types.ObjectId(userId), read: false },
      { read: true, readAt: new Date() },
    );
    return result.modifiedCount > 0;
  }

  async handleOrderEvent(event: any): Promise<void> {
    try {
      const { orderId, status, userId } = event.payload;
      
      await this.createAndSendNotification({
        recipientId: userId,
        title: 'Order Status Update',
        message: `Your order #${orderId} status is now ${status}`,
        type: 'push',
        payload: {
          orderId,
          status,
          eventType: 'ORDER_UPDATE'
        }
      });

    } catch (error) {
      this.logger.error('Error handling order event:', error);
      throw error;
    }
  }

  async handleUserEvent(event: any): Promise<void> {
    try {
      const { userId, eventType } = event.payload;
      
      let title = '';
      let message = '';

      switch (eventType) {
        case 'USER_CREATED':
          title = 'Welcome!';
          message = 'Your account has been successfully created';
          break;
        case 'PASSWORD_RESET':
          title = 'Password Reset';
          message = 'Your password has been reset successfully';
          break;
        default:
          this.logger.warn(`Unhandled user event type: ${eventType}`);
          return;
      }

      await this.createAndSendNotification({
        recipientId: userId,
        title,
        message,
        type: 'push',
        payload: { eventType }
      });

    } catch (error) {
      this.logger.error('Error handling user event:', error);
      throw error;
    }
  }

  async handleUserCreatedEvent(event: any): Promise<void> {
    const { role, userId, name, email } = event.payload;
    
    switch(role) {
      case Role.PARTNER:
        await this.handlePartnerCreated(event);
        break;
      case Role.ADMIN:
      case Role.ADMIN_ASSISTANT:
        await this.handleAdminCreated(event);
        break;
      case Role.SUPER_ADMIN:
        await this.handleSuperAdminCreated(event);
        break;
      default:
        this.logger.log(`No specific handler for USER_CREATED_${role} event`);
    }
  }

  private async handlePartnerCreated(event: any): Promise<void> {
    const { userId, name, email } = event.payload;
    
    try {
      const admins = await this.userCacheService.getUsersByRole(Role.ADMIN);
      const assistantAdmins = await this.userCacheService.getUsersByRole(Role.ADMIN_ASSISTANT);
      const recipients = [...admins, ...assistantAdmins];

      for (const recipient of recipients) {
        await this.createAndSendNotification({
          recipientId: recipient._id.toString(),
          title: 'New Partner Awaiting Approval',
          message: `Partner ${name} (${email}) is awaiting your validation`,
          type: 'both',
          payload: {
            partnerId: userId,
            eventType: 'PARTNER_CREATED'
          }
        });
      }
    } catch (error) {
      this.logger.error('Error handling partner created event:', error);
      throw error;
    }
  }

  private async handleAdminCreated(event: any): Promise<void> {
    const { userId, name, email, role } = event.payload;
    
    try {
      const superAdmins = await this.userCacheService.getUsersByRole(Role.SUPER_ADMIN);
      
      for (const admin of superAdmins) {
        await this.createAndSendNotification({
          recipientId: admin._id.toString(),
          title: `New ${role} Created`,
          message: `A new ${role} (${name}, ${email}) has been created`,
          type: 'email',
          payload: {
            userId,
            eventType: `${role}_CREATED`
          }
        });
      }
    } catch (error) {
      this.logger.error('Error handling admin created event:', error);
      throw error;
    }
  }

  private async handleSuperAdminCreated(event: any): Promise<void> {
    this.logger.log(`Super Admin created: ${JSON.stringify(event.payload)}`);
  }

  async handlePartnerValidatedEvent(event: any): Promise<void> {
    const { partnerId, validatedBy } = event.payload;
    
    try {
      const [partner, admin] = await Promise.all([
        this.userCacheService.getUserById(partnerId),
        this.userCacheService.getUserById(validatedBy)
      ]);

      if (!partner || !admin) {
        this.logger.warn('Partner or admin not found for validation event');
        return;
      }

      // Notify partner
      await this.createAndSendNotification({
        recipientId: partnerId,
        title: 'Account Validated',
        message: `Your partner account has been validated by ${admin.name}`,
        type: 'both',
        payload: {
          eventType: 'PARTNER_VALIDATED',
          validatedBy: admin.name
        }
      });

      // Notify other admins (optional)
      const otherAdmins = (await this.userCacheService.getUsersByRole(Role.ADMIN))
        .filter(a => a._id.toString() !== validatedBy);

      for (const admin of otherAdmins) {
        await this.createAndSendNotification({
          recipientId: admin._id.toString(),
          title: 'Partner Validated',
          message: `Partner ${partner.name} has been validated by ${admin.name}`,
          type: 'push',
          payload: {
            partnerId,
            eventType: 'PARTNER_VALIDATED_BY_OTHER'
          }
        });
      }
    } catch (error) {
      this.logger.error('Error handling partner validated event:', error);
      throw error;
    }
  }

  private async createAndSendNotification(params: {
    recipientId: string;
    title: string;
    message: string;
    type: 'email' | 'push' | 'both';
    payload?: Record<string, any>;
  }): Promise<NotificationDocument> {
    try {
      const notification = await this.create({
        userId: params.recipientId,
        title: params.title,
        message: params.message,
        type: params.type,
        payload: params.payload || {}
      });

      // Envoyer par email si nécessaire
      if (params.type === 'email' || params.type === 'both') {
        const recipient = await this.userCacheService.getUserById(params.recipientId);
        if (recipient) {
          await this.mailService.sendNotificationEmail(
            recipient.email,
            {
              title: params.title,
              message: params.message,
              actionLink: this.getActionLink(notification.payload?.eventType, notification.payload)
            }
          );
        }
      }

      return notification;
    } catch (error) {
      this.logger.error('Error creating and sending notification:', error);
      throw error;
    }
  }

 private getActionLink(eventType?: string, payload?: any): string | undefined {
    const link = this.generateActionLink(eventType, payload);
    return link !== null ? link : undefined;
  }

  async getUserNotifications(userId: string): Promise<NotificationDocument[]> {
    return this.notificationModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

 private generateActionLink(eventType?: string, payload?: any): string | null {
    if (!eventType || !payload) {
      return null;
    }
  
    switch(eventType) {
      case 'PARTNER_CREATED':
        return `/admin/partners/${payload.partnerId}/validate`;
      case 'PARTNER_VALIDATED':
        return `/partner/dashboard`;
      default:
        return null;
    }
  }

  // notification.service.ts
async handlePartnerCreatedEvent(event: any): Promise<void> {
  try {
    const { userId, name, email } = event.payload;
    
    // 1. Récupérer les administrateurs et assistants
    const admins = await this.userCacheService.getUsersByRole(Role.ADMIN);
    const assistantAdmins = await this.userCacheService.getUsersByRole(Role.ADMIN_ASSISTANT);
    const recipients = [...admins, ...assistantAdmins];

    // 2. Créer et envoyer les notifications
    for (const recipient of recipients) {
      await this.createAndSendNotification({
        recipientId: recipient._id.toString(),
        title: 'Nouveau partenaire en attente',
        message: `Le partenaire ${name} (${email}) attend votre validation`,
        type: 'both', // Email + notification interne
        payload: {
          partnerId: userId,
          eventType: 'PARTNER_CREATED'
        }
      });
    }
  } catch (error) {
    this.logger.error('Error handling partner created event:', error);
    throw error;
  }
}

async handleUserLoggedInEvent(event: any): Promise<void> {
  try {
    const { userId, timestamp, ipAddress, deviceInfo } = event;

    this.logger.log(`USER_LOGGED_IN event received for user: ${userId}`);
    
  
    this.logger.debug(`User ${userId} logged in at ${timestamp || 'unknown time'} from ${ipAddress || 'unknown IP'} using ${deviceInfo || 'unknown device'}`);
    
  } catch (error) {
    this.logger.error('Error handling USER_LOGGED_IN event:', error);
    throw error;
  }
}
}