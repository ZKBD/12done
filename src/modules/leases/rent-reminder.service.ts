import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/database';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '@/mail/mail.service';

@Injectable()
export class RentReminderService {
  private readonly logger = new Logger(RentReminderService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private mail: MailService,
  ) {}

  /**
   * Send 5-day rent reminders (PROD-102.3, PROD-102.6)
   * Runs daily at 9:00 AM
   */
  @Cron('0 9 * * *', { name: 'rent-reminder-5-days' })
  async sendRentReminders(): Promise<void> {
    this.logger.log('Starting 5-day rent reminder job');

    const fiveDaysFromNow = new Date();
    fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
    fiveDaysFromNow.setHours(23, 59, 59, 999);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find pending payments due in 5 days that haven't received a reminder
    const upcomingPayments = await this.prisma.rentPayment.findMany({
      where: {
        status: 'PENDING',
        dueDate: {
          gte: today,
          lte: fiveDaysFromNow,
        },
        reminderSentAt: null,
        lease: {
          status: 'ACTIVE',
        },
      },
      include: {
        lease: {
          include: {
            property: true,
            tenant: true,
            landlord: true,
          },
        },
      },
    });

    this.logger.log(`Found ${upcomingPayments.length} payments due in 5 days`);

    for (const payment of upcomingPayments) {
      try {
        const { lease } = payment;
        const dueDate = payment.dueDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        // Send email to tenant (PROD-102.3)
        await this.mail.sendRentReminderEmail(
          lease.tenant.email,
          lease.tenant.firstName,
          lease.property.title,
          Number(payment.amount),
          payment.currency,
          dueDate,
        );

        // Create in-app notification (PROD-102.6)
        await this.notifications.create(
          lease.tenantId,
          'RENT_REMINDER_TENANT',
          'Rent Due Soon',
          `Your rent of ${payment.amount} ${payment.currency} for "${lease.property.title}" is due on ${dueDate}`,
          {
            leaseId: lease.id,
            paymentId: payment.id,
            propertyId: lease.propertyId,
            dueDate: payment.dueDate,
          },
        );

        // Update reminderSentAt
        await this.prisma.rentPayment.update({
          where: { id: payment.id },
          data: { reminderSentAt: new Date() },
        });

        this.logger.log(
          `Sent reminder for payment ${payment.id} to ${lease.tenant.email}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to send reminder for payment ${payment.id}:`,
          error,
        );
      }
    }

    this.logger.log('Completed 5-day rent reminder job');
  }

  /**
   * Check for overdue payments (PROD-102.5)
   * Runs daily at 10:00 AM
   */
  @Cron('0 10 * * *', { name: 'rent-overdue-check' })
  async checkOverduePayments(): Promise<void> {
    this.logger.log('Starting overdue payment check');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find pending payments past due date
    const overduePayments = await this.prisma.rentPayment.findMany({
      where: {
        status: 'PENDING',
        dueDate: {
          lt: today,
        },
        lease: {
          status: 'ACTIVE',
        },
      },
      include: {
        lease: {
          include: {
            property: true,
            tenant: true,
            landlord: true,
          },
        },
      },
    });

    this.logger.log(`Found ${overduePayments.length} overdue payments`);

    for (const payment of overduePayments) {
      try {
        const { lease } = payment;
        const daysOverdue = Math.floor(
          (today.getTime() - payment.dueDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        // Update status to OVERDUE
        await this.prisma.rentPayment.update({
          where: { id: payment.id },
          data: { status: 'OVERDUE' },
        });

        // Check if we should send notification (first time or every 7 days)
        const shouldNotify =
          !payment.overdueSentAt ||
          this.daysSince(payment.overdueSentAt) >= 7;

        if (shouldNotify) {
          // Notify tenant (PROD-102.5)
          await this.mail.sendRentOverdueEmail(
            lease.tenant.email,
            lease.tenant.firstName,
            lease.property.title,
            Number(payment.amount),
            payment.currency,
            daysOverdue,
          );

          await this.notifications.create(
            lease.tenantId,
            'RENT_OVERDUE_TENANT',
            'Rent Payment Overdue',
            `Your rent payment of ${payment.amount} ${payment.currency} for "${lease.property.title}" is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`,
            {
              leaseId: lease.id,
              paymentId: payment.id,
              propertyId: lease.propertyId,
              daysOverdue,
            },
          );

          // Notify landlord (PROD-102.5)
          await this.notifications.create(
            lease.landlordId,
            'RENT_OVERDUE_LANDLORD',
            'Tenant Payment Overdue',
            `Rent payment of ${payment.amount} ${payment.currency} from ${lease.tenant.firstName} ${lease.tenant.lastName} for "${lease.property.title}" is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`,
            {
              leaseId: lease.id,
              paymentId: payment.id,
              propertyId: lease.propertyId,
              tenantId: lease.tenantId,
              daysOverdue,
            },
          );

          // Update overdueSentAt
          await this.prisma.rentPayment.update({
            where: { id: payment.id },
            data: { overdueSentAt: new Date() },
          });

          this.logger.log(
            `Sent overdue notification for payment ${payment.id} (${daysOverdue} days overdue)`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to process overdue payment ${payment.id}:`,
          error,
        );
      }
    }

    this.logger.log('Completed overdue payment check');
  }

  /**
   * Check for expired leases and update their status
   * Runs daily at 1:00 AM
   */
  @Cron('0 1 * * *', { name: 'lease-expiry-check' })
  async checkExpiredLeases(): Promise<void> {
    this.logger.log('Starting lease expiry check');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find active leases that have ended
    const expiredLeases = await this.prisma.lease.findMany({
      where: {
        status: 'ACTIVE',
        endDate: {
          lt: today,
        },
      },
      include: {
        property: true,
        tenant: true,
      },
    });

    this.logger.log(`Found ${expiredLeases.length} expired leases`);

    for (const lease of expiredLeases) {
      try {
        // Update status to EXPIRED
        await this.prisma.lease.update({
          where: { id: lease.id },
          data: { status: 'EXPIRED' },
        });

        // Notify both parties
        await this.notifications.create(
          lease.tenantId,
          'RENT_REMINDER_TENANT',
          'Lease Expired',
          `Your lease for "${lease.property.title}" has expired`,
          {
            leaseId: lease.id,
            propertyId: lease.propertyId,
          },
        );

        await this.notifications.create(
          lease.landlordId,
          'RENT_PAYMENT_RECEIVED',
          'Lease Expired',
          `The lease for "${lease.property.title}" with ${lease.tenant.firstName} ${lease.tenant.lastName} has expired`,
          {
            leaseId: lease.id,
            propertyId: lease.propertyId,
            tenantId: lease.tenantId,
          },
        );

        this.logger.log(`Marked lease ${lease.id} as expired`);
      } catch (error) {
        this.logger.error(`Failed to expire lease ${lease.id}:`, error);
      }
    }

    this.logger.log('Completed lease expiry check');
  }

  /**
   * Calculate days since a given date
   */
  private daysSince(date: Date): number {
    const now = new Date();
    return Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    );
  }
}
