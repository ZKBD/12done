import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  context: Record<string, unknown>;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;
  private fromEmail: string;
  private frontendUrl: string;

  constructor(private configService: ConfigService) {
    this.fromEmail = this.configService.get<string>('mail.from') || 'noreply@12done.com';
    this.frontendUrl = this.configService.get<string>('app.frontendUrl') || 'http://localhost:3000';

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('mail.host'),
      port: this.configService.get<number>('mail.port'),
      secure: false, // true for 465, false for other ports
      auth:
        this.configService.get<string>('mail.user') && this.configService.get<string>('mail.pass')
          ? {
              user: this.configService.get<string>('mail.user'),
              pass: this.configService.get<string>('mail.pass'),
            }
          : undefined,
    });
  }

  private async loadTemplate(templateName: string): Promise<handlebars.TemplateDelegate> {
    const templatePath = path.join(__dirname, 'templates', `${templateName}.hbs`);

    try {
      const templateSource = fs.readFileSync(templatePath, 'utf-8');
      return handlebars.compile(templateSource);
    } catch {
      this.logger.warn(`Template ${templateName} not found, using fallback`);
      return handlebars.compile('<html><body>{{{content}}}</body></html>');
    }
  }

  async sendMail(options: EmailOptions): Promise<void> {
    try {
      const template = await this.loadTemplate(options.template);
      const html = template({
        ...options.context,
        frontendUrl: this.frontendUrl,
        year: new Date().getFullYear(),
      });

      await this.transporter.sendMail({
        from: `"12done.com" <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html,
      });

      this.logger.log(`Email sent to ${options.to}: ${options.subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}`, error);
      throw error;
    }
  }

  async sendVerificationEmail(email: string, firstName: string, token: string): Promise<void> {
    const verificationUrl = `${this.frontendUrl}/auth/verify-email?token=${token}`;

    await this.sendMail({
      to: email,
      subject: 'Verify your email - 12done.com',
      template: 'verification',
      context: {
        firstName,
        verificationUrl,
      },
    });
  }

  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    await this.sendMail({
      to: email,
      subject: 'Welcome to 12done.com!',
      template: 'welcome',
      context: {
        firstName,
        loginUrl: `${this.frontendUrl}/auth/login`,
      },
    });
  }

  async sendPasswordResetEmail(email: string, firstName: string, token: string): Promise<void> {
    const resetUrl = `${this.frontendUrl}/auth/reset-password?token=${token}`;

    await this.sendMail({
      to: email,
      subject: 'Reset your password - 12done.com',
      template: 'password-reset',
      context: {
        firstName,
        resetUrl,
      },
    });
  }

  async sendInvitationEmail(
    email: string,
    inviterName: string,
    token: string,
  ): Promise<void> {
    const invitationUrl = `${this.frontendUrl}/auth/register?invitation=${token}`;

    await this.sendMail({
      to: email,
      subject: `${inviterName} invited you to 12done.com`,
      template: 'invitation',
      context: {
        inviterName,
        invitationUrl,
      },
    });
  }

  async sendSearchAgentMatchEmail(
    email: string,
    firstName: string,
    searchAgentName: string,
    matchCount: number,
    searchUrl: string,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: `New matches for "${searchAgentName}" - 12done.com`,
      template: 'search-match',
      context: {
        firstName,
        searchAgentName,
        matchCount,
        searchUrl,
      },
    });
  }
}
