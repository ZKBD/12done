import { Module } from '@nestjs/common';
import { ServiceProvidersController } from './service-providers.controller';
import { ServiceProvidersService } from './service-providers.service';
import { DatabaseModule } from '@/database';

@Module({
  imports: [DatabaseModule],
  controllers: [ServiceProvidersController],
  providers: [ServiceProvidersService],
  exports: [ServiceProvidersService],
})
export class ServiceProvidersModule {}
