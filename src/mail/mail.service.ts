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
    // Try multiple paths to find templates (handles both dev and prod)
    const possiblePaths = [
      path.join(__dirname, 'templates', `${templateName}.hbs`),
      path.join(process.cwd(), 'src', 'mail', 'templates', `${templateName}.hbs`),
      path.join(process.cwd(), 'dist', 'mail', 'templates', `${templateName}.hbs`),
    ];

    for (const templatePath of possiblePaths) {
      try {
        const templateSource = fs.readFileSync(templatePath, 'utf-8');
        return handlebars.compile(templateSource);
      } catch {
        // Try next path
      }
    }

    this.logger.warn(`Template ${templateName} not found in any location, using fallback`);
    return handlebars.compile('<html><body>{{{content}}}</body></html>');
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
    unsubscribeUrl?: string,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: `New matches for "${searchAgentName}" - 12done.com`,
      template: 'search-match',
      context: {
        firstName,
        searchAgentName,
        matchCount,
        searchUrl: `${this.frontendUrl}${searchUrl}`,
        unsubscribeUrl: unsubscribeUrl ? `${this.frontendUrl}${unsubscribeUrl}` : undefined,
      },
    });
  }

  async sendSearchAgentDigestEmail(
    email: string,
    firstName: string,
    searchAgentName: string,
    matchCount: number,
    properties: Array<{
      id: string;
      title: string;
      city: string;
      price: string;
      bedrooms?: number;
      bathrooms?: number;
      squareMeters?: number;
      imageUrl?: string;
    }>,
    searchUrl: string,
    unsubscribeUrl?: string,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: `${matchCount} new ${matchCount === 1 ? 'property' : 'properties'} for "${searchAgentName}" - 12done.com`,
      template: 'search-digest',
      context: {
        firstName,
        searchAgentName,
        matchCount,
        properties: properties.slice(0, 10), // Limit to 10 in email
        searchUrl: `${this.frontendUrl}${searchUrl}`,
        unsubscribeUrl: unsubscribeUrl ? `${this.frontendUrl}${unsubscribeUrl}` : undefined,
      },
    });
  }

  async sendPaymentSuccessEmail(
    email: string,
    firstName: string,
    transactionId: string,
    propertyTitle: string,
    amount: string,
    currency: string,
    paidAt: string,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: 'Payment Successful - 12done.com',
      template: 'payment-success',
      context: {
        firstName,
        transactionId,
        propertyTitle,
        amount,
        currency,
        paidAt,
        dashboardUrl: `${this.frontendUrl}/transactions/${transactionId}`,
      },
    });
  }

  async sendPaymentFailedEmail(
    email: string,
    firstName: string,
    transactionId: string,
    propertyTitle: string,
    amount: string,
    currency: string,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: 'Payment Failed - 12done.com',
      template: 'payment-failed',
      context: {
        firstName,
        transactionId,
        propertyTitle,
        amount,
        currency,
        retryUrl: `${this.frontendUrl}/transactions/${transactionId}/pay`,
      },
    });
  }

  // ============================================
  // APPLICATION STATUS EMAILS (PROD-104)
  // ============================================

  async sendApplicationReceivedEmail(
    email: string,
    firstName: string,
    propertyTitle: string,
    submittedAt: string,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: `Application Received - ${propertyTitle}`,
      template: 'application-received',
      context: {
        firstName,
        propertyTitle,
        submittedAt,
        dashboardUrl: `${this.frontendUrl}/dashboard/applications`,
      },
    });
  }

  async sendApplicationApprovedEmail(
    email: string,
    firstName: string,
    propertyTitle: string,
    ownerName: string,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: `Congratulations! Application Approved - ${propertyTitle}`,
      template: 'application-approved',
      context: {
        firstName,
        propertyTitle,
        ownerName,
        dashboardUrl: `${this.frontendUrl}/dashboard/applications`,
      },
    });
  }

  async sendApplicationRejectedEmail(
    email: string,
    firstName: string,
    propertyTitle: string,
    rejectionReason?: string,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: `Application Update - ${propertyTitle}`,
      template: 'application-rejected',
      context: {
        firstName,
        propertyTitle,
        rejectionReason,
        searchUrl: `${this.frontendUrl}/search`,
      },
    });
  }

  // ============================================
  // RENT REMINDER EMAILS (PROD-102)
  // ============================================

  async sendRentReminderEmail(
    email: string,
    firstName: string,
    propertyTitle: string,
    amount: number,
    currency: string,
    dueDate: string,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: `Rent Due Soon - ${propertyTitle}`,
      template: 'rent-reminder',
      context: {
        firstName,
        propertyTitle,
        amount,
        currency,
        dueDate,
        dashboardUrl: `${this.frontendUrl}/leases`,
      },
    });
  }

  async sendRentOverdueEmail(
    email: string,
    firstName: string,
    propertyTitle: string,
    amount: number,
    currency: string,
    daysOverdue: number,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: `Rent Payment Overdue - ${propertyTitle}`,
      template: 'rent-overdue',
      context: {
        firstName,
        propertyTitle,
        amount,
        currency,
        daysOverdue,
        dashboardUrl: `${this.frontendUrl}/leases`,
      },
    });
  }

  async sendRentPaymentReceivedEmail(
    email: string,
    firstName: string,
    propertyTitle: string,
    tenantName: string,
    amount: number,
    currency: string,
    paidAt: string,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: `Rent Payment Received - ${propertyTitle}`,
      template: 'rent-payment-received',
      context: {
        firstName,
        propertyTitle,
        tenantName,
        amount,
        currency,
        paidAt,
        dashboardUrl: `${this.frontendUrl}/leases`,
      },
    });
  }

  // ============================================
  // MAINTENANCE REQUEST EMAILS (PROD-103)
  // ============================================

  async sendMaintenanceSubmittedEmail(
    email: string,
    firstName: string,
    tenantName: string,
    propertyTitle: string,
    title: string,
    description: string,
    priority: string,
    preferredDate?: string,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: `New Maintenance Request - ${propertyTitle}`,
      template: 'maintenance-submitted',
      context: {
        firstName,
        tenantName,
        propertyTitle,
        title,
        description,
        priority,
        preferredDate,
        dashboardUrl: `${this.frontendUrl}/maintenance`,
      },
    });
  }

  async sendMaintenanceApprovedEmail(
    email: string,
    firstName: string,
    propertyTitle: string,
    title: string,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: `Maintenance Request Approved - ${propertyTitle}`,
      template: 'maintenance-approved',
      context: {
        firstName,
        propertyTitle,
        title,
        dashboardUrl: `${this.frontendUrl}/maintenance`,
      },
    });
  }

  async sendMaintenanceRejectedEmail(
    email: string,
    firstName: string,
    propertyTitle: string,
    title: string,
    rejectionReason: string,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: `Maintenance Request Rejected - ${propertyTitle}`,
      template: 'maintenance-rejected',
      context: {
        firstName,
        propertyTitle,
        title,
        rejectionReason,
        dashboardUrl: `${this.frontendUrl}/maintenance`,
      },
    });
  }

  async sendMaintenanceAssignedEmail(
    email: string,
    firstName: string,
    propertyTitle: string,
    title: string,
    providerName: string,
    scheduledDate?: string,
    scheduledTimeSlot?: string,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: `Service Provider Assigned - ${propertyTitle}`,
      template: 'maintenance-assigned',
      context: {
        firstName,
        propertyTitle,
        title,
        providerName,
        scheduledDate,
        scheduledTimeSlot,
        dashboardUrl: `${this.frontendUrl}/maintenance`,
      },
    });
  }

  async sendMaintenanceScheduledEmail(
    email: string,
    firstName: string,
    propertyTitle: string,
    title: string,
    scheduledDate: string,
    scheduledTimeSlot: string,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: `Maintenance Scheduled - ${propertyTitle}`,
      template: 'maintenance-scheduled',
      context: {
        firstName,
        propertyTitle,
        title,
        scheduledDate,
        scheduledTimeSlot,
        dashboardUrl: `${this.frontendUrl}/maintenance`,
      },
    });
  }

  async sendMaintenanceCompletedEmail(
    email: string,
    firstName: string,
    propertyTitle: string,
    title: string,
    completionNotes?: string,
    actualCost?: string,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: `Maintenance Completed - ${propertyTitle}`,
      template: 'maintenance-completed',
      context: {
        firstName,
        propertyTitle,
        title,
        completionNotes,
        actualCost,
        dashboardUrl: `${this.frontendUrl}/maintenance`,
      },
    });
  }

  // ============================================
  // LEASE RENEWAL EMAILS (PROD-105)
  // ============================================

  async sendLeaseRenewalReminderEmail(
    email: string,
    firstName: string,
    propertyTitle: string,
    tenantName: string,
    endDate: string,
    daysUntilExpiry: number,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: `Lease Ending Soon - ${propertyTitle}`,
      template: 'lease-renewal-reminder',
      context: {
        firstName,
        propertyTitle,
        tenantName,
        endDate,
        daysUntilExpiry,
        dashboardUrl: `${this.frontendUrl}/leases`,
      },
    });
  }

  async sendLeaseRenewalOfferEmail(
    email: string,
    firstName: string,
    propertyTitle: string,
    proposedStartDate: string,
    proposedEndDate: string,
    proposedRentAmount: number,
    offerExpiresAt: string,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: `Lease Renewal Offer - ${propertyTitle}`,
      template: 'lease-renewal-offer',
      context: {
        firstName,
        propertyTitle,
        proposedStartDate,
        proposedEndDate,
        proposedRentAmount,
        offerExpiresAt,
        dashboardUrl: `${this.frontendUrl}/leases`,
      },
    });
  }

  async sendLeaseRenewalAcceptedEmail(
    email: string,
    firstName: string,
    propertyTitle: string,
    otherPartyName: string,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: `Lease Renewal Accepted - ${propertyTitle}`,
      template: 'lease-renewal-accepted',
      context: {
        firstName,
        propertyTitle,
        otherPartyName,
        dashboardUrl: `${this.frontendUrl}/leases`,
      },
    });
  }

  async sendLeaseRenewalDeclinedEmail(
    email: string,
    firstName: string,
    propertyTitle: string,
    tenantName: string,
    declineReason?: string,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: `Lease Renewal Declined - ${propertyTitle}`,
      template: 'lease-renewal-declined',
      context: {
        firstName,
        propertyTitle,
        tenantName,
        declineReason,
        dashboardUrl: `${this.frontendUrl}/leases`,
      },
    });
  }

  async sendLeaseRenewalExpiredEmail(
    email: string,
    firstName: string,
    propertyTitle: string,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: `Lease Renewal Offer Expired - ${propertyTitle}`,
      template: 'lease-renewal-expired',
      context: {
        firstName,
        propertyTitle,
        dashboardUrl: `${this.frontendUrl}/leases`,
      },
    });
  }

  // ============================================
  // MESSAGING EMAILS (PROD-200)
  // ============================================

  async sendNewMessageEmail(
    email: string,
    firstName: string,
    senderName: string,
    messagePreview: string,
    conversationId: string,
    propertyTitle?: string,
    conversationSubject?: string,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: `New message from ${senderName} - 12done.com`,
      template: 'new-message',
      context: {
        firstName,
        senderName,
        messagePreview,
        propertyTitle,
        conversationSubject,
        conversationUrl: `${this.frontendUrl}/messages/${conversationId}`,
      },
    });
  }
}
