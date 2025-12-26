import {
  Controller,
  Get,
  Post,
  Param,
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
import { UserRole } from '@prisma/client';
import { CountriesService, CountryResponseDto } from './countries.service';
import { JwtAuthGuard } from '@/modules/auth/guards';
import { RolesGuard } from '@/common/guards';
import { Roles } from '@/common/decorators';

@ApiTags('countries')
@Controller('countries')
export class CountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get list of countries (USER-040)' })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean, description: 'Only show active countries' })
  @ApiResponse({
    status: 200,
    description: 'List of countries',
  })
  async findAll(
    @Query('activeOnly') activeOnly?: string,
  ): Promise<CountryResponseDto[]> {
    return this.countriesService.findAll(activeOnly !== 'false');
  }

  @Get(':code')
  @ApiOperation({ summary: 'Get country by ISO code' })
  @ApiParam({ name: 'code', description: 'ISO 3166-1 alpha-2 country code' })
  @ApiResponse({
    status: 200,
    description: 'Country details',
  })
  @ApiResponse({ status: 404, description: 'Country not found' })
  async findByCode(@Param('code') code: string): Promise<CountryResponseDto> {
    return this.countriesService.findByCode(code);
  }

  @Post('seed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Seed default countries (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Number of countries seeded',
  })
  async seedCountries(): Promise<{ count: number }> {
    return this.countriesService.seedDefaultCountries();
  }
}
