import { Args, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql';
import { NotificationService } from './notification.service';
import { CreateNotificationInput } from './dto/create-notification.dto';
import { Notification } from './entities/notification.entity';
import { Inject } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';

@Resolver(() => Notification)
export class NotificationResolver {
  constructor(
    private readonly notificationService: NotificationService,
    @Inject('PUB_SUB') private readonly pubSub: PubSub,
  ) {}

  @Mutation(() => Notification)
  async createNotification(
    @Args('input') input: CreateNotificationInput,
  ) {
    const notification = await this.notificationService.create(input);
    return notification;
  }

  @Query(() => [Notification])
  async getUserNotifications(@Args('userId') userId: string) {
    return this.notificationService.findAllForUser(userId);
  }

  @Query(() => [Notification])
  async getUnreadNotifications(@Args('userId') userId: string) {
    return this.notificationService.getUnreadNotifications(userId);
  }

  @Mutation(() => Notification)
  async markNotificationAsRead(@Args('notificationId') notificationId: string) {
    return this.notificationService.markAsRead(notificationId);
  }

  @Mutation(() => Boolean)
  async markAllNotificationsAsRead(@Args('userId') userId: string) {
    return this.notificationService.markAllAsRead(userId);
  }

  @Subscription(() => Notification, {
    filter: (
      payload: { notificationAdded: Notification; userId: string }, 
      variables: { userId: string }
    ) => {
      return payload.userId === variables.userId;
    },
    resolve: (payload: { notificationAdded: Notification; userId: string }) => {
      return payload.notificationAdded;
    }
  })
  notificationAdded(@Args('userId') userId: string) {
    return this.pubSub.asyncIterableIterator('notificationAdded');
  }

  @Subscription(() => Notification, {
    filter: (
      payload: { notificationAdded: Notification; userId: string },
      variables: { userId: string }
    ) => {
      return payload.userId === variables.userId && !payload.notificationAdded.read;
    },
    resolve: (payload: { notificationAdded: Notification; userId: string }) => {
      return payload.notificationAdded;
    }
  })
  unreadNotificationAdded(@Args('userId') userId: string) {
    return this.pubSub.asyncIterableIterator('notificationAdded');
  }
}