import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LeasesController } from './leases.controller';
import { LeasesService } from './leases.service';
import { RentReminderService } from './rent-reminder.service';
import { DatabaseModule } from '@/database';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '@/mail/mail.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DatabaseModule,
    NotificationsModule,
    MailModule,
  ],
  controllers: [LeasesController],
  providers: [LeasesService, RentReminderService],
  exports: [LeasesService],
})
export class LeasesModule {}
