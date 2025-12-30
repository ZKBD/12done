import {
  Controller,
  Get,
  Post,
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
} from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service';
import { JwtAuthGuard } from '@/modules/auth/guards';
import { CurrentUser, CurrentUserData } from '@/common/decorators';
import {
  RecommendationQueryDto,
  SimilarPropertiesQueryDto,
  RecommendationFeedbackDto,
  RecommendationResponseDto,
  SimilarPropertyResponseDto,
  RecommendationFeedbackResponseDto,
  UserPreferencesDto,
} from './dto/recommendations.dto';

@ApiTags('recommendations')
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get personalized property recommendations (PROD-050)',
    description:
      'Returns AI-powered property recommendations based on user browsing history, favorites, and search agents.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of recommended properties with scores and explanations',
    type: [RecommendationResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getRecommendations(
    @CurrentUser() user: CurrentUserData,
    @Query() query: RecommendationQueryDto,
  ): Promise<RecommendationResponseDto[]> {
    return this.recommendationsService.getRecommendations(user.id, query);
  }

  @Get('preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user preferences extracted from activity',
    description:
      'Returns the user\'s inferred preferences based on favorites, search agents, and browsing history.',
  })
  @ApiResponse({
    status: 200,
    description: 'User preferences',
    type: UserPreferencesDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserPreferences(
    @CurrentUser() user: CurrentUserData,
  ): Promise<UserPreferencesDto> {
    return this.recommendationsService.getUserPreferences(user.id);
  }

  @Get('similar/:propertyId')
  @ApiOperation({
    summary: 'Get similar properties',
    description:
      'Returns properties similar to the specified property based on location, price, size, and features.',
  })
  @ApiParam({ name: 'propertyId', description: 'Property ID to find similar properties for' })
  @ApiResponse({
    status: 200,
    description: 'List of similar properties',
    type: [SimilarPropertyResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async getSimilarProperties(
    @Param('propertyId') propertyId: string,
    @Query() query: SimilarPropertiesQueryDto,
  ): Promise<SimilarPropertyResponseDto[]> {
    return this.recommendationsService.getSimilarProperties(propertyId, query);
  }

  @Post(':propertyId/feedback')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit feedback for a recommendation',
    description:
      'Submit thumbs up/down feedback for a recommendation to improve future suggestions.',
  })
  @ApiParam({ name: 'propertyId', description: 'Property ID to submit feedback for' })
  @ApiResponse({
    status: 200,
    description: 'Feedback submitted successfully',
    type: RecommendationFeedbackResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async submitFeedback(
    @Param('propertyId') propertyId: string,
    @Body() dto: RecommendationFeedbackDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<RecommendationFeedbackResponseDto> {
    return this.recommendationsService.submitFeedback(
      user.id,
      propertyId,
      dto.isPositive,
    );
  }
}
