import { registerEnumType } from '@nestjs/graphql';

export enum NotificationType {
  EMAIL = 'email',
  PUSH = 'push',
  BOTH = 'both',
}

registerEnumType(NotificationType, {
  name: 'NotificationType',
});