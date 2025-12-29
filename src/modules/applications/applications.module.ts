import { Module } from '@nestjs/common';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { DatabaseModule } from '@/database';
import { NotificationsModule } from '../notifications';

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
