import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
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
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { SearchAgentsService } from './search-agents.service';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '@/modules/auth/guards';
import { RolesGuard } from '@/common/guards';
import { CurrentUser, CurrentUserData } from '@/common/decorators';
import {
  CreateSearchAgentDto,
  UpdateSearchAgentDto,
  SearchAgentResponseDto,
  FavoritePropertyResponseDto,
  FavoriteStatsDto,
} from './dto';

@ApiTags('search')
@Controller()
export class SearchController {
  constructor(
    private readonly searchAgentsService: SearchAgentsService,
    private readonly favoritesService: FavoritesService,
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
}
