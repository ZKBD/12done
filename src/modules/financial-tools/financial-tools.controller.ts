import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { FinancialToolsService } from './services';
import {
  PropertyValuationRequestDto,
  PropertyValuationResponseDto,
  PriceHistoryQueryDto,
  PriceAnalyticsResponseDto,
  RoiCalculatorInputDto,
  RoiCalculatorResultDto,
  MortgageCalculatorInputDto,
  MortgageCalculatorResultDto,
  RentalYieldInputDto,
  RentalYieldResultDto,
  DepreciationInputDto,
  DepreciationResultDto,
  CreatePortfolioDto,
  UpdatePortfolioDto,
  AddPropertyToPortfolioDto,
  PortfolioResponseDto,
  LoanComparisonInputDto,
  LoanComparisonResultDto,
  DownPaymentProgramQueryDto,
  DownPaymentProgramResponseDto,
  GenerateTaxReportDto,
  TaxReportResponseDto,
  CashFlowProjectionInputDto,
  CashFlowProjectionResponseDto,
} from './dto';

@ApiTags('Financial Tools')
@Controller('financial-tools')
export class FinancialToolsController {
  constructor(private readonly financialToolsService: FinancialToolsService) {}

  // ============================================
  // PROD-160: AI Property Valuation
  // ============================================

  @Post('valuation')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get AI-powered property valuation (PROD-160)' })
  @ApiResponse({ status: 200, type: PropertyValuationResponseDto })
  async getPropertyValuation(
    @Body() dto: PropertyValuationRequestDto,
  ): Promise<PropertyValuationResponseDto> {
    return this.financialToolsService.getPropertyValuation(dto);
  }

  // ============================================
  // PROD-161: Price Analytics
  // ============================================

  @Get('price-history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get property price history and analytics (PROD-161)' })
  @ApiResponse({ status: 200, type: PriceAnalyticsResponseDto })
  async getPriceHistory(@Query() query: PriceHistoryQueryDto): Promise<PriceAnalyticsResponseDto> {
    return this.financialToolsService.getPriceHistory(query);
  }

  // ============================================
  // PROD-162: Investment Calculators
  // ============================================

  @Post('calculator/roi')
  @ApiOperation({ summary: 'Calculate ROI metrics for investment property (PROD-162)' })
  @ApiResponse({ status: 200, type: RoiCalculatorResultDto })
  calculateRoi(@Body() dto: RoiCalculatorInputDto): RoiCalculatorResultDto {
    return this.financialToolsService.calculateRoi(dto);
  }

  @Post('calculator/mortgage')
  @ApiOperation({ summary: 'Calculate mortgage payment details (PROD-162)' })
  @ApiResponse({ status: 200, type: MortgageCalculatorResultDto })
  calculateMortgage(@Body() dto: MortgageCalculatorInputDto): MortgageCalculatorResultDto {
    return this.financialToolsService.calculateMortgage(dto);
  }

  // ============================================
  // PROD-163: Rental Yield Calculator
  // ============================================

  @Post('calculator/rental-yield')
  @ApiOperation({ summary: 'Calculate rental yield percentage (PROD-163)' })
  @ApiResponse({ status: 200, type: RentalYieldResultDto })
  calculateRentalYield(@Body() dto: RentalYieldInputDto): RentalYieldResultDto {
    return this.financialToolsService.calculateRentalYield(dto);
  }

  // ============================================
  // PROD-164: Depreciation Calculator
  // ============================================

  @Post('calculator/depreciation')
  @ApiOperation({ summary: 'Calculate property depreciation schedule (PROD-164)' })
  @ApiResponse({ status: 200, type: DepreciationResultDto })
  calculateDepreciation(@Body() dto: DepreciationInputDto): DepreciationResultDto {
    return this.financialToolsService.calculateDepreciation(dto);
  }

  // ============================================
  // PROD-165: Portfolio Tracker
  // ============================================

  @Post('portfolios')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create investment portfolio (PROD-165)' })
  @ApiResponse({ status: 201, type: PortfolioResponseDto })
  async createPortfolio(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePortfolioDto,
  ): Promise<PortfolioResponseDto> {
    return this.financialToolsService.createPortfolio(userId, dto);
  }

  @Get('portfolios')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user portfolios (PROD-165)' })
  @ApiResponse({ status: 200, type: [PortfolioResponseDto] })
  async getPortfolios(@CurrentUser('id') userId: string): Promise<PortfolioResponseDto[]> {
    return this.financialToolsService.getPortfolios(userId);
  }

  @Get('portfolios/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get portfolio by ID (PROD-165)' })
  @ApiResponse({ status: 200, type: PortfolioResponseDto })
  async getPortfolioById(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<PortfolioResponseDto> {
    return this.financialToolsService.getPortfolioById(id, userId);
  }

  @Put('portfolios/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update portfolio (PROD-165)' })
  @ApiResponse({ status: 200, type: PortfolioResponseDto })
  async updatePortfolio(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePortfolioDto,
  ): Promise<PortfolioResponseDto> {
    return this.financialToolsService.updatePortfolio(id, userId, dto);
  }

  @Delete('portfolios/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete portfolio (PROD-165)' })
  @ApiResponse({ status: 204 })
  async deletePortfolio(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.financialToolsService.deletePortfolio(id, userId);
  }

  @Post('portfolios/:id/properties')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add property to portfolio (PROD-165)' })
  @ApiResponse({ status: 201, type: PortfolioResponseDto })
  async addPropertyToPortfolio(
    @Param('id') portfolioId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: AddPropertyToPortfolioDto,
  ): Promise<PortfolioResponseDto> {
    return this.financialToolsService.addPropertyToPortfolio(portfolioId, userId, dto);
  }

  @Delete('portfolios/:id/properties/:propertyId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove property from portfolio (PROD-165)' })
  @ApiResponse({ status: 204 })
  async removePropertyFromPortfolio(
    @Param('id') portfolioId: string,
    @Param('propertyId') propertyId: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.financialToolsService.removePropertyFromPortfolio(portfolioId, propertyId, userId);
  }

  // ============================================
  // PROD-166: Loan Comparison
  // ============================================

  @Post('calculator/loan-comparison')
  @ApiOperation({ summary: 'Compare multiple loan options (PROD-166)' })
  @ApiResponse({ status: 200, type: [LoanComparisonResultDto] })
  compareLoanOptions(@Body() dto: LoanComparisonInputDto): LoanComparisonResultDto[] {
    return this.financialToolsService.compareLoanOptions(dto);
  }

  // ============================================
  // PROD-167: Down Payment Assistance
  // ============================================

  @Get('down-payment-programs')
  @ApiOperation({ summary: 'Find down payment assistance programs (PROD-167)' })
  @ApiResponse({ status: 200, type: [DownPaymentProgramResponseDto] })
  async findDownPaymentPrograms(
    @Query() query: DownPaymentProgramQueryDto,
  ): Promise<DownPaymentProgramResponseDto[]> {
    return this.financialToolsService.findDownPaymentPrograms(query);
  }

  // ============================================
  // PROD-168: Tax Reporting
  // ============================================

  @Post('tax-reports')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate tax report for a year (PROD-168)' })
  @ApiResponse({ status: 201, type: TaxReportResponseDto })
  async generateTaxReport(
    @CurrentUser('id') userId: string,
    @Body() dto: GenerateTaxReportDto,
  ): Promise<TaxReportResponseDto> {
    return this.financialToolsService.generateTaxReport(userId, dto);
  }

  @Get('tax-reports')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user tax reports (PROD-168)' })
  @ApiResponse({ status: 200, type: [TaxReportResponseDto] })
  async getTaxReports(@CurrentUser('id') userId: string): Promise<TaxReportResponseDto[]> {
    return this.financialToolsService.getTaxReports(userId);
  }

  // ============================================
  // PROD-169: Cash Flow Projection
  // ============================================

  @Post('cash-flow-projection')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create cash flow projection (PROD-169)' })
  @ApiResponse({ status: 201, type: CashFlowProjectionResponseDto })
  async createCashFlowProjection(
    @Body() dto: CashFlowProjectionInputDto,
  ): Promise<CashFlowProjectionResponseDto> {
    return this.financialToolsService.createCashFlowProjection(dto);
  }

  @Get('cash-flow-projection/:propertyId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get cash flow projections for property (PROD-169)' })
  @ApiResponse({ status: 200, type: [CashFlowProjectionResponseDto] })
  async getCashFlowProjections(
    @Param('propertyId') propertyId: string,
  ): Promise<CashFlowProjectionResponseDto[]> {
    return this.financialToolsService.getCashFlowProjections(propertyId);
  }
}
