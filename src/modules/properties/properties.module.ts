import { Module, forwardRef } from '@nestjs/common';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';
import {
  AvailabilityService,
  InspectionService,
  PricingService,
  MediaService,
  OpenHouseService,
} from './services';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [forwardRef(() => SearchModule)],
  controllers: [PropertiesController],
  providers: [
    PropertiesService,
    AvailabilityService,
    InspectionService,
    PricingService,
    MediaService,
    OpenHouseService,
  ],
  exports: [PropertiesService],
})
export class PropertiesModule {}
