import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { SearchAgentsService } from './search-agents.service';
import { FavoritesService } from './favorites.service';
import { VoiceSearchService } from './voice-search.service';
import { VisualSearchService } from './visual-search.service';
import { JwtAuthGuard } from '@/modules/auth/guards';
import { RolesGuard } from '@/common/guards';
import { CurrentUser, CurrentUserData } from '@/common/decorators';
import {
  CreateSearchAgentDto,
  UpdateSearchAgentDto,
  SearchAgentResponseDto,
  FavoritePropertyResponseDto,
  FavoriteStatsDto,
  VoiceSearchDto,
  VoiceSearchResponseDto,
  VisualSearchQueryDto,
  VisualSearchResponseDto,
  IndexPropertyImagesResponseDto,
  BatchIndexPropertiesDto,
  BatchIndexResponseDto,
} from './dto';

@ApiTags('search')
@Controller()
export class SearchController {
  constructor(
    private readonly searchAgentsService: SearchAgentsService,
    private readonly favoritesService: FavoritesService,
    private readonly voiceSearchService: VoiceSearchService,
    private readonly visualSearchService: VisualSearchService,
  ) {}

  // ============ SEARCH AGENTS (PROD-040, PROD-041) ============

  @Post('search-agents')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a search agent (PROD-040)' })
  @ApiResponse({
    status: 201,
    description: 'Search agent created',
    type: SearchAgentResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Maximum search agents reached' })
  async createSearchAgent(
    @Body() dto: CreateSearchAgentDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<SearchAgentResponseDto> {
    return this.searchAgentsService.create(dto, user.id);
  }

  @Get('search-agents')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List user\'s search agents' })
  @ApiResponse({
    status: 200,
    description: 'List of search agents',
    type: [SearchAgentResponseDto],
  })
  async getSearchAgents(
    @CurrentUser() user: CurrentUserData,
  ): Promise<SearchAgentResponseDto[]> {
    return this.searchAgentsService.findAll(user.id);
  }

  @Get('search-agents/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get search agent by ID' })
  @ApiParam({ name: 'id', description: 'Search Agent ID' })
  @ApiResponse({
    status: 200,
    description: 'Search agent details',
    type: SearchAgentResponseDto,
  })
  async getSearchAgent(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<SearchAgentResponseDto> {
    return this.searchAgentsService.findById(id, user.id, user.role as UserRole);
  }

  @Patch('search-agents/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update search agent' })
  @ApiParam({ name: 'id', description: 'Search Agent ID' })
  @ApiResponse({
    status: 200,
    description: 'Search agent updated',
    type: SearchAgentResponseDto,
  })
  async updateSearchAgent(
    @Param('id') id: string,
    @Body() dto: UpdateSearchAgentDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<SearchAgentResponseDto> {
    return this.searchAgentsService.update(id, dto, user.id, user.role as UserRole);
  }

  @Delete('search-agents/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete search agent' })
  @ApiParam({ name: 'id', description: 'Search Agent ID' })
  async deleteSearchAgent(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<{ message: string }> {
    return this.searchAgentsService.delete(id, user.id, user.role as UserRole);
  }

  @Post('search-agents/:id/toggle-active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle search agent active status' })
  @ApiParam({ name: 'id', description: 'Search Agent ID' })
  async toggleSearchAgentActive(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
    @CurrentUser() user: CurrentUserData,
  ): Promise<SearchAgentResponseDto> {
    return this.searchAgentsService.toggleActive(
      id,
      isActive,
      user.id,
      user.role as UserRole,
    );
  }

  @Post('search-agents/:id/run')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run search agent and get matching property IDs' })
  @ApiParam({ name: 'id', description: 'Search Agent ID' })
  async runSearchAgent(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<{ propertyIds: string[]; count: number }> {
    return this.searchAgentsService.runSearch(id, user.id, user.role as UserRole);
  }

  @Get('search-agents/unsubscribe')
  @ApiOperation({ summary: 'Unsubscribe from search agent email notifications (PROD-041.7)' })
  @ApiQuery({ name: 'token', description: 'Unsubscribe token from email link' })
  @ApiResponse({ status: 200, description: 'Successfully unsubscribed' })
  @ApiResponse({ status: 404, description: 'Invalid or expired token' })
  async unsubscribeFromSearchAgent(
    @Query('token') token: string,
  ): Promise<{ message: string; searchAgentName: string }> {
    return this.searchAgentsService.unsubscribe(token);
  }

  // ============ VOICE SEARCH (PROD-044) ============

  @Post('voice-search/parse')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Parse voice transcript into search criteria (PROD-044.3)',
    description:
      'Parses natural language voice transcript into structured property search criteria with confidence scores.',
  })
  @ApiBody({ type: VoiceSearchDto })
  @ApiResponse({
    status: 200,
    description: 'Parsed search criteria',
    type: VoiceSearchResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async parseVoiceSearch(
    @Body() dto: VoiceSearchDto,
  ): Promise<VoiceSearchResponseDto> {
    return this.voiceSearchService.parse(dto.transcript);
  }

  @Post('voice-search/to-query')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Convert voice transcript to property query parameters (PROD-044.4)',
    description:
      'Parses voice transcript and returns PropertyQueryDto-compatible query parameters for direct use in property search.',
  })
  @ApiBody({ type: VoiceSearchDto })
  @ApiResponse({
    status: 200,
    description: 'Query parameters ready for property search',
  })
  async voiceSearchToQuery(
    @Body() dto: VoiceSearchDto,
  ): Promise<{ parsed: VoiceSearchResponseDto; query: Record<string, unknown> }> {
    const parsed = this.voiceSearchService.parse(dto.transcript);
    const query = this.voiceSearchService.toPropertyQuery(parsed);
    return { parsed, query };
  }

  // ============ FAVORITES (PROD-049) ============

  @Post('favorites/:propertyId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add property to favorites (PROD-049)' })
  @ApiParam({ name: 'propertyId', description: 'Property ID' })
  @ApiResponse({
    status: 201,
    description: 'Property added to favorites',
    type: FavoritePropertyResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Already in favorites' })
  async addFavorite(
    @Param('propertyId') propertyId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<FavoritePropertyResponseDto> {
    return this.favoritesService.addFavorite(propertyId, user.id);
  }

  @Delete('favorites/:propertyId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove property from favorites' })
  @ApiParam({ name: 'propertyId', description: 'Property ID' })
  async removeFavorite(
    @Param('propertyId') propertyId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<{ message: string }> {
    return this.favoritesService.removeFavorite(propertyId, user.id);
  }

  @Get('favorites')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user\'s favorite properties' })
  @ApiResponse({
    status: 200,
    description: 'List of favorites',
    type: [FavoritePropertyResponseDto],
  })
  async getFavorites(
    @CurrentUser() user: CurrentUserData,
  ): Promise<FavoritePropertyResponseDto[]> {
    return this.favoritesService.getFavorites(user.id);
  }

  @Get('favorites/ids')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get list of favorite property IDs (for quick checks)' })
  async getFavoriteIds(
    @CurrentUser() user: CurrentUserData,
  ): Promise<string[]> {
    return this.favoritesService.getFavoriteIds(user.id);
  }

  @Get('favorites/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get favorite statistics' })
  @ApiResponse({
    status: 200,
    description: 'Favorite statistics',
    type: FavoriteStatsDto,
  })
  async getFavoriteStats(
    @CurrentUser() user: CurrentUserData,
  ): Promise<FavoriteStatsDto> {
    return this.favoritesService.getStats(user.id);
  }

  @Post('favorites/:propertyId/toggle')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle favorite status' })
  @ApiParam({ name: 'propertyId', description: 'Property ID' })
  async toggleFavorite(
    @Param('propertyId') propertyId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<{ isFavorite: boolean }> {
    return this.favoritesService.toggleFavorite(propertyId, user.id);
  }

  @Get('favorites/:propertyId/check')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if property is favorited' })
  @ApiParam({ name: 'propertyId', description: 'Property ID' })
  async checkFavorite(
    @Param('propertyId') propertyId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<{ isFavorite: boolean }> {
    const isFavorite = await this.favoritesService.isFavorite(propertyId, user.id);
    return { isFavorite };
  }

  // ============ VISUAL SEARCH (PROD-045) ============

  @Post('visual-search')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Find visually similar properties (PROD-045)',
    description:
      'Upload an image to find properties with visually similar photos using perceptual hashing.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPEG, PNG, WebP, GIF)',
        },
      },
      required: ['image'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'List of visually similar properties',
    type: VisualSearchResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid image file' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async visualSearch(
    @UploadedFile() file: Express.Multer.File,
    @Query() query: VisualSearchQueryDto,
  ): Promise<VisualSearchResponseDto> {
    this.visualSearchService.validateImageFile(file);
    return this.visualSearchService.findSimilarProperties(file.buffer, query);
  }

  @Post('visual-search/index/:propertyId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Index property images for visual search (PROD-045)',
    description: 'Generates perceptual hashes for all photos of a property.',
  })
  @ApiParam({ name: 'propertyId', description: 'Property ID to index' })
  @ApiResponse({
    status: 200,
    description: 'Indexing result',
    type: IndexPropertyImagesResponseDto,
  })
  async indexPropertyImages(
    @Param('propertyId') propertyId: string,
  ): Promise<IndexPropertyImagesResponseDto> {
    return this.visualSearchService.indexPropertyImages(propertyId);
  }

  @Post('visual-search/index-batch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Batch index multiple properties for visual search',
    description: 'Index images for multiple properties at once.',
  })
  @ApiBody({ type: BatchIndexPropertiesDto })
  @ApiResponse({
    status: 200,
    description: 'Batch indexing results',
    type: BatchIndexResponseDto,
  })
  async batchIndexProperties(
    @Body() dto: BatchIndexPropertiesDto,
  ): Promise<BatchIndexResponseDto> {
    const details: IndexPropertyImagesResponseDto[] = [];
    let totalIndexed = 0;
    let totalFailed = 0;

    for (const propertyId of dto.propertyIds) {
      const result = await this.visualSearchService.indexPropertyImages(propertyId);
      details.push(result);
      totalIndexed += result.indexedCount;
      totalFailed += result.failedCount;
    }

    return {
      totalProcessed: dto.propertyIds.length,
      totalIndexed,
      totalFailed,
      details,
    };
  }

  @Get('visual-search/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get visual search indexing statistics' })
  @ApiResponse({
    status: 200,
    description: 'Indexing statistics',
  })
  async getVisualSearchStats(): Promise<{
    totalMedia: number;
    indexedMedia: number;
    unindexedMedia: number;
    indexedPercentage: number;
  }> {
    return this.visualSearchService.getIndexingStats();
  }
}
