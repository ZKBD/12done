import { Module } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { RevenueShareController } from './revenue-share.controller';
import { RevenueShareService } from './services';

@Module({
  controllers: [RevenueShareController],
  providers: [RevenueShareService, PrismaService],
  exports: [RevenueShareService],
})
export class RevenueShareModule {}
