import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { NegotiationsService } from './negotiations.service';
import { JwtAuthGuard } from '@/modules/auth/guards';
import { CurrentUser, CurrentUserData } from '@/common/decorators';
import {
  CreateNegotiationDto,
  CreateOfferDto,
  RespondToOfferDto,
  NegotiationQueryDto,
  NegotiationResponseDto,
  NegotiationListResponseDto,
  OfferResponseDto,
} from './dto/negotiation.dto';

@ApiTags('negotiations')
@Controller('negotiations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NegotiationsController {
  constructor(private readonly negotiationsService: NegotiationsService) {}

  // ============================================
  // NEGOTIATION CRUD (PROD-090)
  // ============================================

  @Post()
  @ApiOperation({
    summary: 'Start a new negotiation (PROD-090.3)',
    description: 'Initiate a negotiation for a property with optional initial offer',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Negotiation created successfully',
    type: NegotiationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Property not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Active negotiation already exists',
  })
  async create(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateNegotiationDto,
  ): Promise<NegotiationResponseDto> {
    return this.negotiationsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List user negotiations (PROD-091)',
    description: 'Get all negotiations where user is buyer or seller',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Negotiations retrieved successfully',
    type: NegotiationListResponseDto,
  })
  async findAll(
    @CurrentUser() user: CurrentUserData,
    @Query() query: NegotiationQueryDto,
  ): Promise<NegotiationListResponseDto> {
    return this.negotiationsService.findAll(user.id, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get negotiation details (PROD-091)',
    description: 'Retrieve full negotiation details with all offers',
  })
  @ApiParam({ name: 'id', description: 'Negotiation ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Negotiation retrieved successfully',
    type: NegotiationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Negotiation not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<NegotiationResponseDto> {
    return this.negotiationsService.findOne(id, user.id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Cancel negotiation (PROD-090.8)',
    description: 'Cancel an active negotiation',
  })
  @ApiParam({ name: 'id', description: 'Negotiation ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Negotiation cancelled successfully',
    type: NegotiationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Negotiation not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Negotiation is not active',
  })
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<NegotiationResponseDto> {
    return this.negotiationsService.cancel(id, user.id);
  }

  // ============================================
  // OFFER ENDPOINTS (PROD-090.5 - PROD-090.7)
  // ============================================

  @Post(':id/offers')
  @ApiOperation({
    summary: 'Submit an offer (PROD-090.5)',
    description: 'Submit a new offer or counter-offer on a negotiation',
  })
  @ApiParam({ name: 'id', description: 'Negotiation ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Offer submitted successfully',
    type: OfferResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Negotiation not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot submit offer',
  })
  async submitOffer(
    @Param('id') negotiationId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateOfferDto,
  ): Promise<OfferResponseDto> {
    return this.negotiationsService.submitOffer(negotiationId, user.id, dto);
  }

  @Post('offers/:offerId/respond')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Respond to an offer (PROD-090.6, PROD-090.7)',
    description: 'Accept, reject, or counter an offer',
  })
  @ApiParam({ name: 'offerId', description: 'Offer ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Response recorded successfully',
    type: NegotiationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Offer not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot respond to offer',
  })
  async respondToOffer(
    @Param('offerId') offerId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: RespondToOfferDto,
  ): Promise<NegotiationResponseDto> {
    return this.negotiationsService.respondToOffer(offerId, user.id, dto);
  }

  // ============================================
  // TRANSACTION ENDPOINTS (PROD-095)
  // ============================================

  @Get(':id/transaction')
  @ApiOperation({
    summary: 'Get transaction for negotiation (PROD-095)',
    description: 'Retrieve transaction details for an accepted negotiation',
  })
  @ApiParam({ name: 'id', description: 'Negotiation ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transaction retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Transaction not found',
  })
  async getTransaction(
    @Param('id') negotiationId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.negotiationsService.getTransaction(negotiationId, user.id);
  }

  @Get('transactions/history')
  @ApiOperation({
    summary: 'Get transaction history (PROD-095)',
    description: 'List all transactions for the current user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transaction history retrieved successfully',
  })
  async getTransactionHistory(
    @CurrentUser() user: CurrentUserData,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.negotiationsService.getTransactionHistory(
      user.id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }
}
