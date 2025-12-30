import { Module } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { NeighborhoodController } from './neighborhood.controller';
import { NeighborhoodService } from './services';

@Module({
  controllers: [NeighborhoodController],
  providers: [NeighborhoodService, PrismaService],
  exports: [NeighborhoodService],
})
export class NeighborhoodModule {}
