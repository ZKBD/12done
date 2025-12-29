import { Module } from '@nestjs/common';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { DatabaseModule } from '@/database';
import { NotificationsModule } from '../notifications';
import { MailModule } from '@/mail/mail.module';

@Module({
  imports: [DatabaseModule, NotificationsModule, MailModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
