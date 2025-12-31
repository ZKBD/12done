import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards';
import { CurrentUser, CurrentUserData } from '@/common/decorators';
import { PoiType, AmbientSoundCategory, InterestCategory } from '@prisma/client';

import { PoiService } from './poi.service';
import { NarrationService } from './narration.service';
import { PreferencesService } from './preferences.service';
import { SavedPlacesService } from './saved-places.service';
import { ToursService } from './tours.service';
import { NotesService } from './notes.service';
import { AmbientSoundsService } from './ambient-sounds.service';
import { OfflineModeService } from './offline-mode.service';

import {
  // POI
  NearbyPoiQueryDto,
  PoiResponseDto,
  // Narration
  NarrationRequestDto,
  NarrationResponseDto,
  // Preferences
  UpdatePreferencesDto,
  PreferencesResponseDto,
  // Saved Places
  SavePlaceDto,
  UpdateSavedPlaceDto,
  SavedPlaceResponseDto,
  // Tours
  CreateTourDto,
  UpdateTourDto,
  ReorderStopsDto,
  TourStopDto,
  TourResponseDto,
  // Notes
  CreateNoteDto,
  UpdateNoteDto,
  NoteResponseDto,
  NotePhotoDto,
  // Ambient Sounds (PROD-128)
  AmbientSoundResponseDto,
  AmbientSoundQueryDto,
  UpdateAmbientSoundPreferencesDto,
  AmbientSoundPreferencesResponseDto,
  // Offline Mode (PROD-129)
  CreateOfflineRegionDto,
  OfflineRegionResponseDto,
  OfflineStorageResponseDto,
  OfflinePoiDataResponseDto,
  // Interest History (PROD-133)
  InterestHistoryResponseDto,
  SuggestedInterestsQueryDto,
  SuggestedInterestsResponseDto,
} from './dto';

@ApiTags('tour-guide')
@Controller('tour-guide')
export class TourGuideController {
  constructor(
    private readonly poiService: PoiService,
    private readonly narrationService: NarrationService,
    private readonly preferencesService: PreferencesService,
    private readonly savedPlacesService: SavedPlacesService,
    private readonly toursService: ToursService,
    private readonly notesService: NotesService,
    private readonly ambientSoundsService: AmbientSoundsService,
    private readonly offlineModeService: OfflineModeService,
  ) {}

  // ============================================
  // POI Endpoints (PROD-121, PROD-122)
  // ============================================

  @Get('pois/nearby')
  @ApiOperation({
    summary: 'Get nearby POIs (PROD-121)',
    description: 'Search for points of interest near a location',
  })
  @ApiResponse({
    status: 200,
    description: 'List of nearby POIs',
    type: [PoiResponseDto],
  })
  async getNearbyPois(@Query() query: NearbyPoiQueryDto): Promise<PoiResponseDto[]> {
    return this.poiService.getNearbyPois(query);
  }

  @Get('pois/:placeId')
  @ApiOperation({
    summary: 'Get POI details (PROD-122.6)',
    description: 'Get detailed information about a specific POI',
  })
  @ApiParam({ name: 'placeId', description: 'Google Places ID' })
  @ApiResponse({
    status: 200,
    description: 'POI details',
    type: PoiResponseDto,
  })
  async getPoiDetails(
    @Param('placeId') placeId: string,
    @Query('language') language?: string,
  ): Promise<PoiResponseDto> {
    return this.poiService.getPoiDetails({ placeId, language });
  }

  // ============================================
  // Narration Endpoints (PROD-123, PROD-127)
  // ============================================

  @Post('narration')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate POI narration (PROD-123)',
    description: 'Generate AI narration for a POI with voice style and interests',
  })
  @ApiResponse({
    status: 200,
    description: 'Generated narration',
    type: NarrationResponseDto,
  })
  async generateNarration(
    @Body() dto: NarrationRequestDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<NarrationResponseDto> {
    // If no voice style specified, use user's preference
    if (!dto.voiceStyle) {
      dto.voiceStyle = await this.preferencesService.getVoiceStyle(user.id);
    }
    if (!dto.language) {
      dto.language = await this.preferencesService.getLanguage(user.id);
    }
    if (!dto.interests) {
      dto.interests = await this.preferencesService.getInterests(user.id);
    }

    return this.narrationService.generateNarration(dto);
  }

  // ============================================
  // Preferences Endpoints (PROD-127, PROD-133)
  // ============================================

  @Get('preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get tour preferences (PROD-127)',
    description: "Get user's tour guide preferences",
  })
  @ApiResponse({
    status: 200,
    description: 'User preferences',
    type: PreferencesResponseDto,
  })
  async getPreferences(@CurrentUser() user: CurrentUserData): Promise<PreferencesResponseDto> {
    return this.preferencesService.getPreferences(user.id);
  }

  @Put('preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update tour preferences',
    description: "Update user's tour guide preferences",
  })
  @ApiResponse({
    status: 200,
    description: 'Updated preferences',
    type: PreferencesResponseDto,
  })
  async updatePreferences(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UpdatePreferencesDto,
  ): Promise<PreferencesResponseDto> {
    return this.preferencesService.updatePreferences(user.id, dto);
  }

  // ============================================
  // Saved Places Endpoints (PROD-130)
  // ============================================

  @Get('saved-places')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get saved places (PROD-130.3)',
    description: "Get user's bookmarked places",
  })
  @ApiQuery({ name: 'type', enum: PoiType, required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of saved places',
    type: [SavedPlaceResponseDto],
  })
  async getSavedPlaces(
    @CurrentUser() user: CurrentUserData,
    @Query('type') type?: PoiType,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<SavedPlaceResponseDto[]> {
    return this.savedPlacesService.getSavedPlaces(user.id, { type, limit, offset });
  }

  @Post('saved-places')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Save a place (PROD-130.2)',
    description: 'Bookmark a POI',
  })
  @ApiResponse({
    status: 201,
    description: 'Saved place',
    type: SavedPlaceResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Place already saved' })
  async savePlace(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: SavePlaceDto,
  ): Promise<SavedPlaceResponseDto> {
    return this.savedPlacesService.savePlace(user.id, dto);
  }

  @Get('saved-places/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a saved place' })
  @ApiParam({ name: 'id', description: 'Saved place ID' })
  @ApiResponse({
    status: 200,
    description: 'Saved place details',
    type: SavedPlaceResponseDto,
  })
  async getSavedPlace(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<SavedPlaceResponseDto> {
    return this.savedPlacesService.getSavedPlace(user.id, id);
  }

  @Patch('saved-places/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update saved place notes' })
  @ApiParam({ name: 'id', description: 'Saved place ID' })
  @ApiResponse({
    status: 200,
    description: 'Updated saved place',
    type: SavedPlaceResponseDto,
  })
  async updateSavedPlace(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: UpdateSavedPlaceDto,
  ): Promise<SavedPlaceResponseDto> {
    return this.savedPlacesService.updateSavedPlace(user.id, id, dto);
  }

  @Delete('saved-places/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove saved place (PROD-130.4)',
    description: 'Remove a bookmarked place',
  })
  @ApiParam({ name: 'id', description: 'Saved place ID' })
  @ApiResponse({ status: 204, description: 'Place removed' })
  async removeSavedPlace(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<void> {
    return this.savedPlacesService.removeSavedPlace(user.id, id);
  }

  @Get('saved-places/check/:placeId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if place is saved' })
  @ApiParam({ name: 'placeId', description: 'Google Places ID' })
  @ApiResponse({
    status: 200,
    description: 'Whether place is saved',
    schema: { type: 'object', properties: { isSaved: { type: 'boolean' } } },
  })
  async isPlaceSaved(
    @CurrentUser() user: CurrentUserData,
    @Param('placeId') placeId: string,
  ): Promise<{ isSaved: boolean }> {
    const isSaved = await this.savedPlacesService.isPlaceSaved(user.id, placeId);
    return { isSaved };
  }

  // ============================================
  // Custom Tours Endpoints (PROD-131)
  // ============================================

  @Get('tours')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user tours',
    description: "Get user's custom tours",
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of tours',
    type: [TourResponseDto],
  })
  async getUserTours(
    @CurrentUser() user: CurrentUserData,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<TourResponseDto[]> {
    return this.toursService.getUserTours(user.id, { limit, offset });
  }

  @Get('tours/public')
  @ApiOperation({
    summary: 'Get public tours (PROD-131.7)',
    description: 'Get publicly shared tours',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'lat', required: false, type: Number })
  @ApiQuery({ name: 'lng', required: false, type: Number })
  @ApiQuery({ name: 'radius', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of public tours',
    type: [TourResponseDto],
  })
  async getPublicTours(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('lat') lat?: number,
    @Query('lng') lng?: number,
    @Query('radius') radius?: number,
  ): Promise<TourResponseDto[]> {
    const near =
      lat && lng && radius ? { latitude: lat, longitude: lng, radius } : undefined;
    return this.toursService.getPublicTours({ limit, offset, near });
  }

  @Post('tours')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a tour (PROD-131.1)',
    description: 'Create a custom tour with stops',
  })
  @ApiResponse({
    status: 201,
    description: 'Created tour',
    type: TourResponseDto,
  })
  async createTour(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateTourDto,
  ): Promise<TourResponseDto> {
    return this.toursService.createTour(user.id, dto);
  }

  @Get('tours/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tour details' })
  @ApiParam({ name: 'id', description: 'Tour ID' })
  @ApiResponse({
    status: 200,
    description: 'Tour details',
    type: TourResponseDto,
  })
  async getTour(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<TourResponseDto> {
    return this.toursService.getTour(id, user.id);
  }

  @Patch('tours/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update tour details' })
  @ApiParam({ name: 'id', description: 'Tour ID' })
  @ApiResponse({
    status: 200,
    description: 'Updated tour',
    type: TourResponseDto,
  })
  async updateTour(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: UpdateTourDto,
  ): Promise<TourResponseDto> {
    return this.toursService.updateTour(user.id, id, dto);
  }

  @Delete('tours/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a tour' })
  @ApiParam({ name: 'id', description: 'Tour ID' })
  @ApiResponse({ status: 204, description: 'Tour deleted' })
  async deleteTour(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<void> {
    return this.toursService.deleteTour(user.id, id);
  }

  @Post('tours/:id/stops')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Add stop to tour (PROD-131.2)',
    description: 'Add a new stop to an existing tour',
  })
  @ApiParam({ name: 'id', description: 'Tour ID' })
  @ApiResponse({
    status: 201,
    description: 'Updated tour with new stop',
    type: TourResponseDto,
  })
  async addStop(
    @CurrentUser() user: CurrentUserData,
    @Param('id') tourId: string,
    @Body() dto: TourStopDto,
  ): Promise<TourResponseDto> {
    return this.toursService.addStop(user.id, tourId, dto);
  }

  @Delete('tours/:id/stops/:stopId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove stop from tour' })
  @ApiParam({ name: 'id', description: 'Tour ID' })
  @ApiParam({ name: 'stopId', description: 'Stop ID' })
  @ApiResponse({
    status: 200,
    description: 'Updated tour without the stop',
    type: TourResponseDto,
  })
  async removeStop(
    @CurrentUser() user: CurrentUserData,
    @Param('id') tourId: string,
    @Param('stopId') stopId: string,
  ): Promise<TourResponseDto> {
    return this.toursService.removeStop(user.id, tourId, stopId);
  }

  @Put('tours/:id/stops/order')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Reorder tour stops (PROD-131.3)',
    description: 'Change the order of stops in a tour',
  })
  @ApiParam({ name: 'id', description: 'Tour ID' })
  @ApiResponse({
    status: 200,
    description: 'Tour with reordered stops',
    type: TourResponseDto,
  })
  async reorderStops(
    @CurrentUser() user: CurrentUserData,
    @Param('id') tourId: string,
    @Body() dto: ReorderStopsDto,
  ): Promise<TourResponseDto> {
    return this.toursService.reorderStops(user.id, tourId, dto);
  }

  // ============================================
  // User Notes Endpoints (PROD-132)
  // ============================================

  @Get('notes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user notes (PROD-132.4)',
    description: "Get all user's notes",
  })
  @ApiQuery({ name: 'placeId', required: false, description: 'Filter by place ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of notes',
    type: [NoteResponseDto],
  })
  async getUserNotes(
    @CurrentUser() user: CurrentUserData,
    @Query('placeId') placeId?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<NoteResponseDto[]> {
    return this.notesService.getUserNotes(user.id, { placeId, limit, offset });
  }

  @Post('notes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a note (PROD-132.2)',
    description: 'Create a note on a POI',
  })
  @ApiResponse({
    status: 201,
    description: 'Created note',
    type: NoteResponseDto,
  })
  async createNote(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateNoteDto,
  ): Promise<NoteResponseDto> {
    return this.notesService.createNote(user.id, dto);
  }

  @Get('notes/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a note' })
  @ApiParam({ name: 'id', description: 'Note ID' })
  @ApiResponse({
    status: 200,
    description: 'Note details',
    type: NoteResponseDto,
  })
  async getNote(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<NoteResponseDto> {
    return this.notesService.getNote(user.id, id);
  }

  @Patch('notes/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a note (PROD-132.5)',
    description: 'Update note text or photos',
  })
  @ApiParam({ name: 'id', description: 'Note ID' })
  @ApiResponse({
    status: 200,
    description: 'Updated note',
    type: NoteResponseDto,
  })
  async updateNote(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: UpdateNoteDto,
  ): Promise<NoteResponseDto> {
    return this.notesService.updateNote(user.id, id, dto);
  }

  @Post('notes/:id/photos')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Add photos to note (PROD-132.3)',
    description: 'Add photo attachments to a note',
  })
  @ApiParam({ name: 'id', description: 'Note ID' })
  @ApiResponse({
    status: 200,
    description: 'Note with added photos',
    type: NoteResponseDto,
  })
  async addPhotos(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() photos: NotePhotoDto[],
  ): Promise<NoteResponseDto> {
    return this.notesService.addPhotosToNote(user.id, id, photos);
  }

  @Delete('notes/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a note (PROD-132.5)',
    description: 'Delete a note',
  })
  @ApiParam({ name: 'id', description: 'Note ID' })
  @ApiResponse({ status: 204, description: 'Note deleted' })
  async deleteNote(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<void> {
    return this.notesService.deleteNote(user.id, id);
  }

  // ============================================
  // Ambient Sounds Endpoints (PROD-128)
  // ============================================

  @Get('ambient-sounds')
  @ApiOperation({
    summary: 'Get ambient sounds (PROD-128)',
    description: 'Get ambient sound library with optional filters',
  })
  @ApiQuery({ name: 'category', enum: AmbientSoundCategory, required: false })
  @ApiResponse({
    status: 200,
    description: 'List of ambient sounds',
    type: [AmbientSoundResponseDto],
  })
  async getAmbientSounds(@Query() query: AmbientSoundQueryDto): Promise<AmbientSoundResponseDto[]> {
    return this.ambientSoundsService.getSounds(query);
  }

  @Get('ambient-sounds/categories')
  @ApiOperation({
    summary: 'Get ambient sound categories (PROD-128)',
    description: 'Get list of all available ambient sound categories',
  })
  @ApiResponse({
    status: 200,
    description: 'List of categories',
    schema: { type: 'array', items: { type: 'string', enum: Object.values(AmbientSoundCategory) } },
  })
  getAmbientSoundCategories(): AmbientSoundCategory[] {
    return this.ambientSoundsService.getAvailableCategories();
  }

  @Get('ambient-sounds/for-poi/:poiType')
  @ApiOperation({
    summary: 'Get sounds for POI type (PROD-128)',
    description: 'Get recommended ambient sounds for a specific POI type',
  })
  @ApiParam({ name: 'poiType', enum: PoiType })
  @ApiResponse({
    status: 200,
    description: 'List of recommended sounds',
    type: [AmbientSoundResponseDto],
  })
  async getSoundsForPoiType(@Param('poiType') poiType: PoiType): Promise<AmbientSoundResponseDto[]> {
    return this.ambientSoundsService.getSoundsForPoiType(poiType);
  }

  @Get('ambient-sounds/preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get ambient sound preferences (PROD-128)',
    description: "Get user's ambient sound settings",
  })
  @ApiResponse({
    status: 200,
    description: 'Ambient sound preferences',
    type: AmbientSoundPreferencesResponseDto,
  })
  async getAmbientSoundPreferences(
    @CurrentUser() user: CurrentUserData,
  ): Promise<AmbientSoundPreferencesResponseDto> {
    return this.ambientSoundsService.getPreferences(user.id);
  }

  @Put('ambient-sounds/preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update ambient sound preferences (PROD-128)',
    description: 'Update ambient sound settings (enabled, volume)',
  })
  @ApiResponse({
    status: 200,
    description: 'Updated preferences',
    type: AmbientSoundPreferencesResponseDto,
  })
  async updateAmbientSoundPreferences(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UpdateAmbientSoundPreferencesDto,
  ): Promise<AmbientSoundPreferencesResponseDto> {
    return this.ambientSoundsService.updatePreferences(user.id, dto);
  }

  @Get('ambient-sounds/:id')
  @ApiOperation({
    summary: 'Get ambient sound by ID (PROD-128)',
    description: 'Get a specific ambient sound',
  })
  @ApiParam({ name: 'id', description: 'Sound ID' })
  @ApiResponse({
    status: 200,
    description: 'Ambient sound details',
    type: AmbientSoundResponseDto,
  })
  async getAmbientSoundById(@Param('id') id: string): Promise<AmbientSoundResponseDto> {
    return this.ambientSoundsService.getSoundById(id);
  }

  // ============================================
  // Interest History Endpoints (PROD-133)
  // ============================================

  @Get('preferences/interest-history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get interest usage history (PROD-133)',
    description: "Get user's interest query history",
  })
  @ApiResponse({
    status: 200,
    description: 'Interest usage history',
    type: [InterestHistoryResponseDto],
  })
  async getInterestHistory(
    @CurrentUser() user: CurrentUserData,
  ): Promise<InterestHistoryResponseDto[]> {
    return this.preferencesService.getInterestHistory(user.id);
  }

  @Post('preferences/interest-history/:interest')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Record interest usage (PROD-133)',
    description: 'Record that an interest was used in a query',
  })
  @ApiParam({ name: 'interest', enum: InterestCategory })
  @ApiResponse({
    status: 200,
    description: 'Updated interest history',
    type: InterestHistoryResponseDto,
  })
  async recordInterestUsage(
    @CurrentUser() user: CurrentUserData,
    @Param('interest') interest: InterestCategory,
  ): Promise<InterestHistoryResponseDto> {
    return this.preferencesService.recordInterestUsage(user.id, interest);
  }

  @Delete('preferences/interest-history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Clear interest history (PROD-133)',
    description: "Clear user's interest usage history",
  })
  @ApiResponse({ status: 204, description: 'History cleared' })
  async clearInterestHistory(@CurrentUser() user: CurrentUserData): Promise<void> {
    return this.preferencesService.clearInterestHistory(user.id);
  }

  @Get('preferences/suggested-interests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get suggested interests (PROD-133)',
    description: 'Get context-aware interest suggestions based on POI type and history',
  })
  @ApiQuery({ name: 'poiType', enum: PoiType, required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Suggested interests',
    type: SuggestedInterestsResponseDto,
  })
  async getSuggestedInterests(
    @CurrentUser() user: CurrentUserData,
    @Query() query: SuggestedInterestsQueryDto,
  ): Promise<SuggestedInterestsResponseDto> {
    return this.preferencesService.getSuggestedInterests(user.id, query.poiType, query.limit);
  }

  // ============================================
  // Offline Mode Endpoints (PROD-129)
  // ============================================

  @Get('offline/regions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get offline regions (PROD-129)',
    description: "Get user's downloaded offline regions",
  })
  @ApiResponse({
    status: 200,
    description: 'List of offline regions',
    type: [OfflineRegionResponseDto],
  })
  async getOfflineRegions(
    @CurrentUser() user: CurrentUserData,
  ): Promise<OfflineRegionResponseDto[]> {
    return this.offlineModeService.getRegions(user.id);
  }

  @Post('offline/regions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create offline region (PROD-129)',
    description: 'Create a new offline region for data download',
  })
  @ApiResponse({
    status: 201,
    description: 'Created region',
    type: OfflineRegionResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Region with name already exists' })
  async createOfflineRegion(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateOfflineRegionDto,
  ): Promise<OfflineRegionResponseDto> {
    return this.offlineModeService.createRegion(user.id, dto);
  }

  @Get('offline/regions/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get offline region details (PROD-129)',
    description: 'Get a specific offline region',
  })
  @ApiParam({ name: 'id', description: 'Region ID' })
  @ApiResponse({
    status: 200,
    description: 'Region details',
    type: OfflineRegionResponseDto,
  })
  async getOfflineRegion(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<OfflineRegionResponseDto> {
    return this.offlineModeService.getRegion(user.id, id);
  }

  @Post('offline/regions/:id/download')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Download region data (PROD-129)',
    description: 'Download and cache POI data for a region',
  })
  @ApiParam({ name: 'id', description: 'Region ID' })
  @ApiResponse({
    status: 200,
    description: 'Region with downloaded data',
    type: OfflineRegionResponseDto,
  })
  async downloadRegionData(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<OfflineRegionResponseDto> {
    return this.offlineModeService.downloadRegionData(user.id, id);
  }

  @Post('offline/regions/:id/narrations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Pre-generate narrations (PROD-129)',
    description: 'Pre-generate narrations for all POIs in a region',
  })
  @ApiParam({ name: 'id', description: 'Region ID' })
  @ApiResponse({
    status: 200,
    description: 'Region with generated narrations',
    type: OfflineRegionResponseDto,
  })
  async preGenerateNarrations(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<OfflineRegionResponseDto> {
    return this.offlineModeService.preGenerateNarrations(user.id, id);
  }

  @Post('offline/regions/:id/sync')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sync region data (PROD-129)',
    description: 'Refresh expired region data',
  })
  @ApiParam({ name: 'id', description: 'Region ID' })
  @ApiResponse({
    status: 200,
    description: 'Synced region',
    type: OfflineRegionResponseDto,
  })
  async syncRegion(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<OfflineRegionResponseDto> {
    return this.offlineModeService.syncRegion(user.id, id);
  }

  @Get('offline/regions/:id/pois')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get cached POIs (PROD-129)',
    description: 'Get cached POI data for a region',
  })
  @ApiParam({ name: 'id', description: 'Region ID' })
  @ApiResponse({
    status: 200,
    description: 'Cached POI data',
    type: [OfflinePoiDataResponseDto],
  })
  async getRegionPois(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<OfflinePoiDataResponseDto[]> {
    return this.offlineModeService.getRegionPois(user.id, id);
  }

  @Delete('offline/regions/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete offline region (PROD-129)',
    description: 'Delete an offline region and its cached data',
  })
  @ApiParam({ name: 'id', description: 'Region ID' })
  @ApiResponse({ status: 204, description: 'Region deleted' })
  async deleteOfflineRegion(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<void> {
    return this.offlineModeService.deleteRegion(user.id, id);
  }

  @Get('offline/storage')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get storage usage (PROD-129)',
    description: 'Get offline data storage usage summary',
  })
  @ApiResponse({
    status: 200,
    description: 'Storage usage summary',
    type: OfflineStorageResponseDto,
  })
  async getStorageUsage(
    @CurrentUser() user: CurrentUserData,
  ): Promise<OfflineStorageResponseDto> {
    return this.offlineModeService.getStorageUsage(user.id);
  }
}
