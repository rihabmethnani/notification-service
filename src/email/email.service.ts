import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { createTransport, Transporter } from 'nodemailer';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification } from 'src/notification/entities/notification.entity';
import mailConfig from 'src/config/mail.config';

@Injectable()
export class MailService {
  private readonly transporter: Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(
    @Inject(mailConfig.KEY)
    private readonly mailConfiguration: ConfigType<typeof mailConfig>,
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<Notification>,
  ) {
    // ✅ Assigner à `this.transporter` au lieu d'une variable locale
    this.transporter = nodemailer.createTransport({
      host: this.mailConfiguration.host,
      port: this.mailConfiguration.port,
      secure: this.mailConfiguration.secure,
      auth: {
        user: this.mailConfiguration.user,
        pass: this.mailConfiguration.password,
      },
    });

    // ✅ Optionnel : Tester la connexion SMTP au démarrage
    this.testSmtpConnection();
  }

  private async testSmtpConnection() {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified successfully');
    } catch (error) {
      this.logger.error('SMTP connection failed:', error.message);
    }
  }

  // Méthode pour envoyer un email de bienvenue avec mot de passe temporaire
  async sendWelcomeEmail(
    email: string,
    data: {
      userName: string;
      adminEmail?: string;
      password?: string;
    }
  ): Promise<boolean> {
    if (!email) {
      this.logger.error('Email non défini dans sendWelcomeEmail');
      throw new Error('Email requis pour l’envoi');
    }

    const mailOptions = {
      from: this.mailConfiguration.from,
      to: email,
      subject: data.adminEmail
        ? 'Votre compte a été créé'
        : 'Bienvenue sur notre plateforme',
      html: `
        <p>Bonjour ${data.userName},</p>
        ${data.adminEmail ? `
          <p>Votre compte a été créé par ${data.adminEmail}.</p>
          <p>Votre mot de passe temporaire est : <strong>${data.password}</strong></p>
          <p>Vous pouvez dès maintenant vous connecter à la plateforme.</p>
        ` : `
          <p>Bienvenue sur notre plateforme !</p>
        `}
        <p>Cordialement,<br/>L'équipe technique</p>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email envoyé à ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Erreur lors de l'envoi à ${email}:`, error.message);
      throw new Error(`Échec d'envoi de l'email: ${error.message}`);
    }
  }

  // Exemple d'autres méthodes
  async sendOrderStatusUpdate(email: string, data: any): Promise<boolean> {
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
      this.logger.error(`Erreur lors de l'envoi à ${email}:`, error.message);
      throw new Error(`Échec d'envoi de l'email: ${error.message}`);
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
      from: this.mailConfiguration.from,
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
      this.logger.error(`Erreur lors de l'envoi à ${email}:`, error.message);
      throw new Error(`Échec d'envoi de l'email: ${error.message}`);
    }
  }
}