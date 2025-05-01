import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as amqp from 'amqplib';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class RabbitMQConsumer implements OnModuleInit, OnModuleDestroy {
  private connection: amqp.Connection;
  private channel: amqp.Channel;
  private readonly logger = new Logger(RabbitMQConsumer.name);
  private readonly retryInterval = 5000;
  private isInitialized = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
  ) {}

  async onModuleInit() {
    await this.initialize();
  }

  async onModuleDestroy() {
    await this.closeConnection();
  }

  private async initialize() {
    try {
      await this.connect();
      
      // Configuration des exchanges et queues
      await this.setupInfrastructure();
      
      // Configuration du consumer
      await this.setupConsumer();
      
      this.isInitialized = true;
      this.logger.log('RabbitMQ consumer initialized successfully');
    } catch (error) {
      this.logger.error('Initialization failed, retrying...', error);
      setTimeout(() => this.initialize(), this.retryInterval);
    }
  }

  private async connect() {
    this.connection = await amqp.connect(this.configService.get('RABBITMQ_URL'));
    
    this.connection.on('close', () => {
      this.logger.warn('RabbitMQ connection closed, reconnecting...');
      this.isInitialized = false;
      setTimeout(() => this.initialize(), this.retryInterval);
    });

    this.connection.on('error', (error) => {
      this.logger.error('RabbitMQ connection error:', error);
    });

    this.channel = await this.connection.createChannel();
  }

  private async setupInfrastructure() {
    // Déclaration des exchanges
    await this.channel.assertExchange('notifications_events', 'topic', { durable: true });
    await this.channel.assertExchange('notifications_dlx', 'topic', { durable: true });

    // Déclaration de la queue principale avec DLX
    await this.channel.assertQueue('notifications_queue', {
      durable: true
    });
    // Déclaration de la dead letter queue
    await this.channel.assertQueue('notifications_dead_letter_queue', { durable: true });

    // Bindings
    await this.channel.bindQueue('notifications_queue', 'notifications_events', '#');
    await this.channel.bindQueue(
      'notifications_dead_letter_queue',
      'notifications_dlx',
      '#'
    );
  }

  private async setupConsumer() {
    await this.channel.consume(
      'notifications_queue',
      async (msg) => {
        if (!msg) return;

        try {
          const event = JSON.parse(msg.content.toString());
          this.logger.debug(`Processing event: ${event.eventType}`);
          
          await this.routeEvent(event);
          this.channel.ack(msg);
        } catch (error) {
          this.logger.error('Error processing message:', error);
          this.channel.nack(msg, false, false);
        }
      },
      { noAck: false }
    );
  }

  private async routeEvent(event: any) {
    try {
      switch (event.eventType) {
        case 'CREATED_ADMIN':
        case 'CREATED_USER':
        case 'CREATED_PARTNER':
          await this.notificationService.handleUserEvent(event);
          break;
        case 'USER_LOGGED_IN':
          await this.notificationService.handleUserLoggedInEvent(event);
          break;
        default:
          this.logger.warn(`Unhandled event type: ${event.eventType}`);
      }
      
    } catch (error) {
      this.logger.error(`Error handling ${event.eventType} event:`, error);
      throw error;
    }
  }
  

  private async closeConnection() {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
      this.logger.log('RabbitMQ consumer connection closed gracefully');
    } catch (error) {
      this.logger.error('Error closing RabbitMQ consumer connection:', error);
    }
  }
}