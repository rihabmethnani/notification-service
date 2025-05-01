// src/notification/dto/notification-preferences.input.ts
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class NotificationPreferencesInput {
  @Field(() => Boolean)
  email: boolean;

  @Field(() => Boolean)
  push: boolean;
}