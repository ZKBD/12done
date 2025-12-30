import { Module } from '@nestjs/common';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';
import { AiMaintenanceService } from './ai-maintenance.service';
import { PredictiveMaintenanceService } from './predictive-maintenance.service';
import { DatabaseModule } from '@/database';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '@/mail/mail.module';

@Module({
  imports: [DatabaseModule, NotificationsModule, MailModule],
  controllers: [MaintenanceController],
  providers: [MaintenanceService, AiMaintenanceService, PredictiveMaintenanceService],
  exports: [MaintenanceService, AiMaintenanceService, PredictiveMaintenanceService],
})
export class MaintenanceModule {}
