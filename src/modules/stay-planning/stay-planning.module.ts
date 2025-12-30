import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database';
import { StayPlanningController } from './stay-planning.controller';
import {
  SessionService,
  TripPlanService,
  AttractionService,
  CateringService,
} from './services';

@Module({
  imports: [DatabaseModule],
  controllers: [StayPlanningController],
  providers: [
    SessionService,
    TripPlanService,
    AttractionService,
    CateringService,
  ],
  exports: [
    SessionService,
    TripPlanService,
    AttractionService,
    CateringService,
  ],
})
export class StayPlanningModule {}
