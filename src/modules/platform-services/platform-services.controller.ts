import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
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
import { RolesGuard } from '@/common/guards';
import { Roles, CurrentUser, CurrentUserData } from '@/common/decorators';
import { UserRole } from '@prisma/client';
import {
  InsuranceProviderService,
  MortgageProviderService,
  ProviderInquiryService,
} from './services';
import {
  // Insurance Provider DTOs
  CreateInsuranceProviderDto,
  UpdateInsuranceProviderDto,
  QueryInsuranceProvidersDto,
  InsuranceProviderResponseDto,
  PaginatedInsuranceProvidersDto,
  // Mortgage Provider DTOs
  CreateMortgageProviderDto,
  UpdateMortgageProviderDto,
  QueryMortgageProvidersDto,
  MortgageProviderResponseDto,
  PaginatedMortgageProvidersDto,
  // Common DTOs
  UpdateProviderStatusDto,
  // Inquiry DTOs
  CreateInsuranceInquiryDto,
  CreateMortgageInquiryDto,
  RespondToInquiryDto,
  SubmitInquiryFeedbackDto,
  QueryInquiriesDto,
  ProviderInquiryResponseDto,
  PaginatedInquiriesDto,
} from './dto';

// ============================================
// INSURANCE PROVIDER CONTROLLER
// ============================================
@ApiTags('Platform Services - Insurance')
@Controller('platform-services/insurance')
export class InsuranceProviderController {
  constructor(
    private readonly insuranceProviderService: InsuranceProviderService,
  ) {}

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply to become an insurance provider (PROD-081.1)' })
  @ApiResponse({ status: 201, type: InsuranceProviderResponseDto })
  async applyAsProvider(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateInsuranceProviderDto,
  ): Promise<InsuranceProviderResponseDto> {
    return this.insuranceProviderService.applyAsProvider(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List insurance providers (PROD-080.2)' })
  @ApiResponse({ status: 200, type: PaginatedInsuranceProvidersDto })
  async listProviders(
    @Query() query: QueryInsuranceProvidersDto,
  ): Promise<PaginatedInsuranceProvidersDto> {
    return this.insuranceProviderService.listProviders(query);
  }

  @Get('my-profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user\'s insurance provider profile' })
  @ApiResponse({ status: 200, type: InsuranceProviderResponseDto })
  async getMyProfile(
    @CurrentUser() user: CurrentUserData,
  ): Promise<InsuranceProviderResponseDto | null> {
    return this.insuranceProviderService.getProviderByUserId(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get insurance provider by ID (PROD-082.1)' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiResponse({ status: 200, type: InsuranceProviderResponseDto })
  async getProviderById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InsuranceProviderResponseDto> {
    return this.insuranceProviderService.getProviderById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update insurance provider profile (PROD-082.1)' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiResponse({ status: 200, type: InsuranceProviderResponseDto })
  async updateProvider(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UpdateInsuranceProviderDto,
  ): Promise<InsuranceProviderResponseDto> {
    return this.insuranceProviderService.updateProvider(id, user.id, dto);
  }

  // Admin endpoints
  @Get('admin/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List pending applications (Admin only) (PROD-081.5)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, type: PaginatedInsuranceProvidersDto })
  async listPendingApplications(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PaginatedInsuranceProvidersDto> {
    return this.insuranceProviderService.listPendingApplications(page, limit);
  }

  @Patch('admin/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update provider status (Admin only) (PROD-081.5)' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiResponse({ status: 200, type: InsuranceProviderResponseDto })
  async updateProviderStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UpdateProviderStatusDto,
  ): Promise<InsuranceProviderResponseDto> {
    return this.insuranceProviderService.updateProviderStatus(id, user.id, dto);
  }

  @Patch('admin/:id/partner')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle platform partner status (Admin only) (PROD-080.4)' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiQuery({ name: 'isPlatformPartner', type: Boolean })
  @ApiResponse({ status: 200, type: InsuranceProviderResponseDto })
  async togglePlatformPartner(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('isPlatformPartner') isPlatformPartner: boolean,
  ): Promise<InsuranceProviderResponseDto> {
    return this.insuranceProviderService.togglePlatformPartner(id, isPlatformPartner);
  }
}

// ============================================
// MORTGAGE PROVIDER CONTROLLER
// ============================================
@ApiTags('Platform Services - Mortgage')
@Controller('platform-services/mortgage')
export class MortgageProviderController {
  constructor(
    private readonly mortgageProviderService: MortgageProviderService,
  ) {}

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply to become a mortgage provider (PROD-081.2)' })
  @ApiResponse({ status: 201, type: MortgageProviderResponseDto })
  async applyAsProvider(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateMortgageProviderDto,
  ): Promise<MortgageProviderResponseDto> {
    return this.mortgageProviderService.applyAsProvider(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List mortgage providers (PROD-080.3)' })
  @ApiResponse({ status: 200, type: PaginatedMortgageProvidersDto })
  async listProviders(
    @Query() query: QueryMortgageProvidersDto,
  ): Promise<PaginatedMortgageProvidersDto> {
    return this.mortgageProviderService.listProviders(query);
  }

  @Get('my-profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user\'s mortgage provider profile' })
  @ApiResponse({ status: 200, type: MortgageProviderResponseDto })
  async getMyProfile(
    @CurrentUser() user: CurrentUserData,
  ): Promise<MortgageProviderResponseDto | null> {
    return this.mortgageProviderService.getProviderByUserId(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get mortgage provider by ID (PROD-082.2)' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiResponse({ status: 200, type: MortgageProviderResponseDto })
  async getProviderById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MortgageProviderResponseDto> {
    return this.mortgageProviderService.getProviderById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update mortgage provider profile (PROD-082.2)' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiResponse({ status: 200, type: MortgageProviderResponseDto })
  async updateProvider(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UpdateMortgageProviderDto,
  ): Promise<MortgageProviderResponseDto> {
    return this.mortgageProviderService.updateProvider(id, user.id, dto);
  }

  @Patch(':id/rates')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update mortgage rates (PROD-082.2)' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiResponse({ status: 200, type: MortgageProviderResponseDto })
  async updateRates(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() rates: Record<string, number>,
  ): Promise<MortgageProviderResponseDto> {
    return this.mortgageProviderService.updateRates(id, user.id, rates);
  }

  // Admin endpoints
  @Get('admin/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List pending applications (Admin only) (PROD-081.5)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, type: PaginatedMortgageProvidersDto })
  async listPendingApplications(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PaginatedMortgageProvidersDto> {
    return this.mortgageProviderService.listPendingApplications(page, limit);
  }

  @Patch('admin/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update provider status (Admin only) (PROD-081.5)' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiResponse({ status: 200, type: MortgageProviderResponseDto })
  async updateProviderStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UpdateProviderStatusDto,
  ): Promise<MortgageProviderResponseDto> {
    return this.mortgageProviderService.updateProviderStatus(id, user.id, dto);
  }

  @Patch('admin/:id/partner')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle platform partner status (Admin only) (PROD-080.4)' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiQuery({ name: 'isPlatformPartner', type: Boolean })
  @ApiResponse({ status: 200, type: MortgageProviderResponseDto })
  async togglePlatformPartner(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('isPlatformPartner') isPlatformPartner: boolean,
  ): Promise<MortgageProviderResponseDto> {
    return this.mortgageProviderService.togglePlatformPartner(id, isPlatformPartner);
  }
}

// ============================================
// PROVIDER INQUIRY CONTROLLER
// ============================================
@ApiTags('Platform Services - Inquiries')
@Controller('platform-services/inquiries')
export class ProviderInquiryController {
  constructor(
    private readonly providerInquiryService: ProviderInquiryService,
  ) {}

  @Post('insurance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create inquiry to insurance provider (PROD-082.3)' })
  @ApiResponse({ status: 201, type: ProviderInquiryResponseDto })
  async createInsuranceInquiry(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateInsuranceInquiryDto,
  ): Promise<ProviderInquiryResponseDto> {
    return this.providerInquiryService.createInsuranceInquiry(user.id, dto);
  }

  @Post('mortgage')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create inquiry to mortgage provider (PROD-082.3)' })
  @ApiResponse({ status: 201, type: ProviderInquiryResponseDto })
  async createMortgageInquiry(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateMortgageInquiryDto,
  ): Promise<ProviderInquiryResponseDto> {
    return this.providerInquiryService.createMortgageInquiry(user.id, dto);
  }

  @Get('my-inquiries')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my sent inquiries' })
  @ApiResponse({ status: 200, type: PaginatedInquiriesDto })
  async listMyInquiries(
    @CurrentUser() user: CurrentUserData,
    @Query() query: QueryInquiriesDto,
  ): Promise<PaginatedInquiriesDto> {
    return this.providerInquiryService.listUserInquiries(user.id, query);
  }

  @Get('provider/insurance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List inquiries received by my insurance provider profile' })
  @ApiResponse({ status: 200, type: PaginatedInquiriesDto })
  async listInsuranceProviderInquiries(
    @CurrentUser() user: CurrentUserData,
    @Query() query: QueryInquiriesDto,
  ): Promise<PaginatedInquiriesDto> {
    return this.providerInquiryService.listProviderInquiries(
      user.id,
      'insurance',
      query,
    );
  }

  @Get('provider/mortgage')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List inquiries received by my mortgage provider profile' })
  @ApiResponse({ status: 200, type: PaginatedInquiriesDto })
  async listMortgageProviderInquiries(
    @CurrentUser() user: CurrentUserData,
    @Query() query: QueryInquiriesDto,
  ): Promise<PaginatedInquiriesDto> {
    return this.providerInquiryService.listProviderInquiries(
      user.id,
      'mortgage',
      query,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get inquiry by ID' })
  @ApiParam({ name: 'id', description: 'Inquiry ID' })
  @ApiResponse({ status: 200, type: ProviderInquiryResponseDto })
  async getInquiryById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ProviderInquiryResponseDto> {
    return this.providerInquiryService.getInquiryById(id, user.id);
  }

  @Post(':id/respond')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Respond to inquiry (Provider only) (PROD-082.4)' })
  @ApiParam({ name: 'id', description: 'Inquiry ID' })
  @ApiResponse({ status: 200, type: ProviderInquiryResponseDto })
  async respondToInquiry(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: RespondToInquiryDto,
  ): Promise<ProviderInquiryResponseDto> {
    return this.providerInquiryService.respondToInquiry(id, user.id, dto);
  }

  @Post(':id/feedback')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit feedback on inquiry (User only) (PROD-082.5)' })
  @ApiParam({ name: 'id', description: 'Inquiry ID' })
  @ApiResponse({ status: 200, type: ProviderInquiryResponseDto })
  async submitFeedback(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: SubmitInquiryFeedbackDto,
  ): Promise<ProviderInquiryResponseDto> {
    return this.providerInquiryService.submitFeedback(id, user.id, dto);
  }
}
