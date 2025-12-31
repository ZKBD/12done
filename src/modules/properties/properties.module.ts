import { Module, forwardRef } from '@nestjs/common';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';
import {
  AvailabilityService,
  InspectionService,
  PricingService,
  MediaService,
  OpenHouseService,
  AiDescriptionService,
  VirtualStagingService,
  TimeOfDayPhotosService,
  MortgageCalculatorService,
} from './services';
import { SearchModule } from '../search/search.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [forwardRef(() => SearchModule), NotificationsModule],
  controllers: [PropertiesController],
  providers: [
    PropertiesService,
    AvailabilityService,
    InspectionService,
    PricingService,
    MediaService,
    OpenHouseService,
    AiDescriptionService,
    VirtualStagingService,
    TimeOfDayPhotosService,
    MortgageCalculatorService,
  ],
  exports: [PropertiesService],
})
export class PropertiesModule {}
