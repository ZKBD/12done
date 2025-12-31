import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { TourGuideController } from './tour-guide.controller';
import { PoiService } from './poi.service';
import { NarrationService } from './narration.service';
import { PreferencesService } from './preferences.service';
import { SavedPlacesService } from './saved-places.service';
import { ToursService } from './tours.service';
import { NotesService } from './notes.service';
import { AmbientSoundsService } from './ambient-sounds.service';
import { OfflineModeService } from './offline-mode.service';

@Module({
  imports: [ConfigModule],
  controllers: [TourGuideController],
  providers: [
    PoiService,
    NarrationService,
    PreferencesService,
    SavedPlacesService,
    ToursService,
    NotesService,
    AmbientSoundsService,
    OfflineModeService,
  ],
  exports: [
    PoiService,
    NarrationService,
    PreferencesService,
    SavedPlacesService,
    ToursService,
    NotesService,
    AmbientSoundsService,
    OfflineModeService,
  ],
})
export class TourGuideModule {}
