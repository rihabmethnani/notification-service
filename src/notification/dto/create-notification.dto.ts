import { InputType, Field } from '@nestjs/graphql';
import { isEnumType } from 'graphql';
import GraphQLJSON from 'graphql-type-json';

@InputType()
export class CreateNotificationInput {
  @Field(() => String)
  userId: string;

  @Field()
  title: string;

  @Field()
  message: string;

  @Field({ nullable: true })
  type?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  payload?: Record<string, any>;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: Record<string, any>;
}