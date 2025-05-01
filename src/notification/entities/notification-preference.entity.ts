import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Field, ID, ObjectType, InputType } from '@nestjs/graphql';

@ObjectType()
class PreferenceDetails {
  @Field({ defaultValue: true })
  orderUpdates: boolean;

  @Field({ defaultValue: true })
  promotions: boolean;

  @Field({ defaultValue: true })
  accountChanges: boolean;
}

@InputType()
export class PreferenceDetailsInput {
  @Field({ nullable: true })
  orderUpdates?: boolean;

  @Field({ nullable: true })
  promotions?: boolean;

  @Field({ nullable: true })
  accountChanges?: boolean;
}

@Schema({ timestamps: true })
@ObjectType()
export class NotificationPreference extends Document {
  @Field(() => ID)
  declare _id: string;

  @Prop({ required: true, unique: true, index: true })
  @Field()
  userId: string;

  @Prop({ default: true })
  @Field()
  emailEnabled: boolean;

  @Prop({ default: true })
  @Field()
  pushEnabled: boolean;

  @Prop({
    type: {
      orderUpdates: { type: Boolean, default: true },
      promotions: { type: Boolean, default: true },
      accountChanges: { type: Boolean, default: true }
    },
    default: () => ({
      orderUpdates: true,
      promotions: true,
      accountChanges: true
    })
  })
  @Field(() => PreferenceDetails)
  preferences: PreferenceDetails;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

@InputType()
export class NotificationPreferenceInput {
  @Field({ nullable: true })
  emailEnabled?: boolean;

  @Field({ nullable: true })
  pushEnabled?: boolean;

  @Field(() => PreferenceDetailsInput, { nullable: true })
  preferences?: PreferenceDetailsInput;
}
export type NotificationPreferenceDocument = NotificationPreference & Document;

export const NotificationPreferenceSchema = SchemaFactory.createForClass(NotificationPreference);