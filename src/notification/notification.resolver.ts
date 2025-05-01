import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { NotificationService } from './notification.service';
import { CreateNotificationInput } from './dto/create-notification.dto';
import { Notification } from './entities/notification.entity';


@Resolver(() => Notification)
export class NotificationResolver {
  constructor(private readonly notificationService: NotificationService) {}

  @Mutation(() => Notification)
  async createNotification(
    @Args('input') input: CreateNotificationInput,
  ) {
    return this.notificationService.create(input);
  }

  @Query(() => [Notification])
  async getUserNotifications(@Args('userId') userId: string) {
    return this.notificationService.findAllForUser(userId);
  }

  // Autres résolvers...
}