import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@Schema({ timestamps: true })
@ObjectType()
export class Notification {
  @Field(() => ID)
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  @Field(() => ID)
  userId: Types.ObjectId;

  @Prop({ required: true })
  @Field()
  title: string;

  @Prop({ required: true })
  @Field()
  message: string;

  @Prop({ default: false })
  @Field()
  read: boolean;

  @Prop()
  @Field({ nullable: true })
  readAt?: Date;

  @Prop({ enum: ['email', 'push', 'both'], default: 'push' })
  @Field()
  type: string;

  @Prop({ default: false })
  @Field()
  emailSent: boolean;

  @Prop()
  @Field({ nullable: true })
  emailSentAt?: Date;

  @Prop({ type: Object })
  @Field(() => GraphQLJSON, { nullable: true })
  payload?: Record<string, any>;

  @Prop({ type: Object })
  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: Record<string, any>;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

export type NotificationDocument = Notification & Document;
export const NotificationSchema = SchemaFactory.createForClass(Notification);