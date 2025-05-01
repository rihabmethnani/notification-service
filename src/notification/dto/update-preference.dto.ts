import { Field, InputType } from '@nestjs/graphql';
import { PreferenceDetailsInput } from '../entities/notification-preference.entity';

@InputType()
export class UpdatePreferenceDto {
  @Field({ nullable: true })
  emailEnabled?: boolean;

  @Field({ nullable: true })
  pushEnabled?: boolean;

  @Field(() => PreferenceDetailsInput, { nullable: true })
  preferences?: PreferenceDetailsInput;
}