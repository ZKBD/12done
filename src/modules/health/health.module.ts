import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { AppCacheModule } from '@/cache';

@Module({
  imports: [AppCacheModule],
  controllers: [HealthController],
})
export class HealthModule {}
