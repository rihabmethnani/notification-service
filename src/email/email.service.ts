import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService, ConfigType } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification } from 'src/notification/entities/notification.entity';
import mailConfig from 'src/config/mail.config';

@Injectable()
export class MailService {
  private readonly transporter: Transporter;
  private readonly logger = new Logger(MailService.name);
  private readonly fromEmail: string;

  constructor(
    @Inject(mailConfig.KEY)
    private readonly mailConfiguration: ConfigType<typeof mailConfig>,
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<Notification>,
  ) {
    this.transporter = createTransport({
      host: this.mailConfiguration.host,
      port: this.mailConfiguration.port,
      secure: this.mailConfiguration.secure,
      auth: {
        user: this.mailConfiguration.user,
        pass: this.mailConfiguration.password,
      },
    });
  }

  async sendOrderStatusUpdate(email: string, data: any) {
    const mailOptions = {
      from: this.mailConfiguration.from,
      to: email,
      subject: `Order Update: Your Order #${data.orderId}`,
      html: `
        <p>Hello ${data.userName},</p>
        <p>The status of your order #${data.orderId} has been updated to <strong>${data.status}</strong>.</p>
        <p>Thank you for shopping with us!</p>
        <p>Best regards,<br/>The Team</p>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      throw error;
    }
  }

  async sendWelcomeEmail(email: string, data: any) {
    const mailOptions = {
      from: this.fromEmail,
      to: email,
      subject: 'Welcome to Our Platform!',
      html: `
        <p>Hello ${data.userName},</p>
        <p>Welcome to our platform! We're excited to have you on board.</p>
        <p>Best regards,<br/>The Team</p>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Welcome email sent to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Error sending welcome email to ${email}:`, error);
      throw error;
    }
  }

  async sendNotificationEmail(
    email: string,
    data: {
      title: string;
      message: string;
      actionLink?: string;
    }
  ): Promise<boolean> {
    const mailOptions = {
      from: this.fromEmail,
      to: email,
      subject: data.title,
      html: `
        <h1>${data.title}</h1>
        <p>${data.message}</p>
        ${data.actionLink ? `<a href="${data.actionLink}">Cliquez ici pour agir</a>` : ''}
        <p>Merci,<br/>L'équipe de notification</p>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error sending notification email:', error);
      throw error;
    }
  }
}