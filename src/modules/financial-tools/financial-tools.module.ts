import { Module } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { FinancialToolsController } from './financial-tools.controller';
import { FinancialToolsService } from './services';

@Module({
  controllers: [FinancialToolsController],
  providers: [FinancialToolsService, PrismaService],
  exports: [FinancialToolsService],
})
export class FinancialToolsModule {}
