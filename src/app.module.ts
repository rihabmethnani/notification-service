// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import * as Joi from 'joi';

import { NotificationModule } from './notification/notification.module';
import { EmailModule } from './email/email.module';
import { RabbitMQModule } from './rabbitMq/rabbitmq.module';
import mailConfig from './config/mail.config';
import { mailConfigValidation } from './config/mail.config.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [mailConfig],
      envFilePath: '.env', // or your env file path


    }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
      inject: [ConfigService],
    }),

    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground:true,
      introspection: true,
      subscriptions: {
        'graphql-ws': true,  // Protocole moderne
        'subscriptions-transport-ws': true  // Pour compatibilité
      },
    }),

    RabbitMQModule,
    EmailModule,
    NotificationModule,
  ],
})
export class AppModule {}