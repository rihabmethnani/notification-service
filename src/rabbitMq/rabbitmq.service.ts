import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as amqp from 'amqplib';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private connection: amqp.Connection;
  private channel: amqp.Channel;
  private readonly logger = new Logger(RabbitMQService.name);
  private readonly retryInterval = 5000;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.connectWithRetry();
  }

  async onModuleDestroy() {
    await this.closeConnection();
  }

  private async connectWithRetry() {
    try {
      await this.connect();
      this.isConnected = true;
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ:', error);
      setTimeout(() => this.connectWithRetry(), this.retryInterval);
    }
  }

  private async connect() {
    this.connection = await amqp.connect(this.configService.get('RABBITMQ_URL'));
    
    this.connection.on('close', () => {
      this.isConnected = false;
      this.logger.warn('RabbitMQ connection closed, reconnecting...');
      setTimeout(() => this.connectWithRetry(), this.retryInterval);
    });

    this.connection.on('error', (error) => {
      this.logger.error('RabbitMQ connection error:', error);
    });

    this.channel = await this.connection.createChannel();
    
    // Déclaration des exchanges principaux
    await this.setupExchanges();
    
    this.logger.log('RabbitMQ connected successfully');
  }

  private async setupExchanges() {
    const exchanges = [
      { name: 'user_events', type: 'topic', options: { durable: true } },
      { name: 'order_events', type: 'topic', options: { durable: true } },
      { name: 'notification_events', type: 'topic', options: { durable: true } }
    ];

    for (const exchange of exchanges) {
      await this.channel.assertExchange(
        exchange.name, 
        exchange.type, 
        exchange.options
      );
    }
  }

  async publishEvent(exchange: string, routingKey: string, payload: any) {
    if (!this.isConnected || !this.channel) {
      throw new Error('RabbitMQ connection not established');
    }

    try {
      const messageBuffer = Buffer.from(JSON.stringify({
        ...payload,
        timestamp: new Date().toISOString()
      }));

      this.channel.publish(
        exchange,
        routingKey,
        messageBuffer,
        { persistent: true }
      );

      this.logger.debug(`Event published to ${exchange} with routing key ${routingKey}`);
    } catch (error) {
      this.logger.error('Error publishing event:', error);
      throw error;
    }
  }

  private async closeConnection() {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
      this.logger.log('RabbitMQ connection closed gracefully');
    } catch (error) {
      this.logger.error('Error closing RabbitMQ connection:', error);
    }
  }
}