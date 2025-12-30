import { Module } from '@nestjs/common';
import { LeasesController } from './leases.controller';
import { LeasesService } from './leases.service';
import { RentReminderService } from './rent-reminder.service';
import { LeaseRenewalService } from './lease-renewal.service';
import { DatabaseModule } from '@/database';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '@/mail/mail.module';

@Module({
  imports: [DatabaseModule, NotificationsModule, MailModule],
  controllers: [LeasesController],
  providers: [LeasesService, RentReminderService, LeaseRenewalService],
  exports: [LeasesService, LeaseRenewalService],
})
export class LeasesModule {}
