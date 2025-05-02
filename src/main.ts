// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { validateEnv } from './config/env.validation';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);
    app.enableCors({
      origin: true,
      credentials: true
    });    
    
  
  
    validateEnv();
    await app.listen(3003);

    console.log(`Notification service is running on port 3003`);
  } catch (error) {
    console.error('Failed to start the application:', error);
    process.exit(1); 
}
}

bootstrap();