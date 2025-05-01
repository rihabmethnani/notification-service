// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { validateEnv } from './config/env.validation';

async function bootstrap() {
  try {
    // Initialisation de l'application NestJS
    const app = await NestFactory.create(AppModule);
 
    // Validation des variables d'environnement
    validateEnv();
    await app.listen(3003);

    console.log(`Notification service is running on port 3003`);
  } catch (error) {
    console.error('Failed to start the application:', error);
    process.exit(1); // Quitte l'application en cas d'erreur critique
  }
}

bootstrap();