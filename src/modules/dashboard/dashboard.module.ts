import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { ExpenseService } from './expense.service';
import { TenantDashboardService } from './tenant-dashboard.service';
import { TenantDocumentService } from './tenant-document.service';
import { DatabaseModule } from '@/database';

@Module({
  imports: [DatabaseModule],
  controllers: [DashboardController],
  providers: [
    DashboardService,
    ExpenseService,
    TenantDashboardService,
    TenantDocumentService,
  ],
  exports: [
    DashboardService,
    ExpenseService,
    TenantDashboardService,
    TenantDocumentService,
  ],
})
export class DashboardModule {}
