import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { FinancialPropertyType, MarketTrend, Prisma } from '@prisma/client';
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
  MonthlyProjectionDto,
} from '../dto';

@Injectable()
export class FinancialToolsService {
  private readonly logger = new Logger(FinancialToolsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // PROD-160: AI Property Valuation
  // ============================================

  async getPropertyValuation(dto: PropertyValuationRequestDto): Promise<PropertyValuationResponseDto> {
    const property = await this.prisma.property.findUnique({
      where: { id: dto.propertyId },
      include: {
        valuations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!property) {
      throw new NotFoundException(`Property ${dto.propertyId} not found`);
    }

    // Check for recent valuation (less than 24 hours old)
    const recentValuation = property.valuations[0];
    if (recentValuation) {
      const hoursSinceValuation =
        (Date.now() - recentValuation.createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceValuation < 24) {
        return this.mapValuationToResponse(recentValuation);
      }
    }

    // Generate new valuation using comparable sales method
    const valuation = await this.generatePropertyValuation(property, dto.method || 'COMPARABLE');

    return this.mapValuationToResponse(valuation);
  }

  private async generatePropertyValuation(
    property: any,
    method: 'COMPARABLE' | 'INCOME' | 'COST',
  ): Promise<any> {
    // Mock AI-powered valuation - in production, this would call external APIs
    const basePrice = Number(property.basePrice);
    const squareMeters = property.squareMeters || 100;

    // Calculate estimated value based on market factors (mock implementation)
    const pricePerSqm = basePrice / squareMeters;
    const marketAdjustment = 0.95 + Math.random() * 0.1; // 95% to 105% adjustment
    const estimatedValue = basePrice * marketAdjustment;

    // Generate comparable sales (mock data)
    const comparableSales = this.generateMockComparables(property);

    // Calculate confidence based on number of comparables and similarity
    const confidenceLevel = Math.min(85, 60 + comparableSales.length * 5);
    const confidenceRange = estimatedValue * (0.1 - confidenceLevel / 1000);

    const valuation = await this.prisma.propertyValuation.create({
      data: {
        propertyId: property.id,
        estimatedValue: new Prisma.Decimal(estimatedValue),
        confidenceLow: new Prisma.Decimal(estimatedValue - confidenceRange),
        confidenceHigh: new Prisma.Decimal(estimatedValue + confidenceRange),
        confidenceLevel,
        comparableSales,
        marketData: {
          trend: 'STABLE',
          avgPricePerSqm: pricePerSqm,
          inventory: Math.floor(Math.random() * 50) + 10,
        },
        propertyDetails: {
          size: squareMeters,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          yearBuilt: property.yearBuilt,
        },
        valuationMethod: method,
        modelVersion: '1.0.0',
      },
    });

    return valuation;
  }

  private generateMockComparables(property: any): any[] {
    const basePrice = Number(property.basePrice);
    const squareMeters = property.squareMeters || 100;
    const comparables = [];

    for (let i = 0; i < 5; i++) {
      const priceVariation = 0.85 + Math.random() * 0.3;
      const sizeVariation = 0.9 + Math.random() * 0.2;

      comparables.push({
        address: `${100 + i * 10} Nearby Street, ${property.city}`,
        price: Math.round(basePrice * priceVariation),
        squareMeters: Math.round(squareMeters * sizeVariation),
        soldDate: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        bedrooms: property.bedrooms || 3,
        bathrooms: property.bathrooms || 2,
        distanceKm: Math.round(Math.random() * 5 * 10) / 10,
      });
    }

    return comparables;
  }

  private mapValuationToResponse(valuation: any): PropertyValuationResponseDto {
    return {
      id: valuation.id,
      propertyId: valuation.propertyId,
      estimatedValue: Number(valuation.estimatedValue),
      confidenceLow: Number(valuation.confidenceLow),
      confidenceHigh: Number(valuation.confidenceHigh),
      confidenceLevel: valuation.confidenceLevel,
      comparableSales: valuation.comparableSales as any[],
      marketData: valuation.marketData as any,
      valuationMethod: valuation.valuationMethod,
      createdAt: valuation.createdAt,
    };
  }

  // ============================================
  // PROD-161: Price Analytics
  // ============================================

  async getPriceHistory(dto: PriceHistoryQueryDto): Promise<PriceAnalyticsResponseDto> {
    const property = await this.prisma.property.findUnique({
      where: { id: dto.propertyId },
    });

    if (!property) {
      throw new NotFoundException(`Property ${dto.propertyId} not found`);
    }

    const where: Prisma.PriceHistoryWhereInput = {
      propertyId: dto.propertyId,
    };

    if (dto.startDate) {
      where.eventDate = { ...where.eventDate as any, gte: new Date(dto.startDate) };
    }
    if (dto.endDate) {
      where.eventDate = { ...where.eventDate as any, lte: new Date(dto.endDate) };
    }

    const history = await this.prisma.priceHistory.findMany({
      where,
      orderBy: { eventDate: 'asc' },
    });

    // If no history, create initial entry based on current listing
    if (history.length === 0) {
      const initialEntry = await this.prisma.priceHistory.create({
        data: {
          propertyId: dto.propertyId,
          price: property.basePrice,
          pricePerSqm: property.squareMeters
            ? new Prisma.Decimal(Number(property.basePrice) / property.squareMeters)
            : null,
          eventType: 'LISTED',
          eventDate: property.publishedAt || property.createdAt,
          daysOnMarket: 0,
          marketTrend: 'STABLE',
        },
      });
      history.push(initialEntry);
    }

    // Calculate analytics
    let priceChangePercent: number | undefined;
    let avgPricePerSqm: number | undefined;

    if (history.length >= 2) {
      const firstPrice = Number(history[0].price);
      const lastPrice = Number(history[history.length - 1].price);
      priceChangePercent = ((lastPrice - firstPrice) / firstPrice) * 100;
    }

    if (property.squareMeters) {
      avgPricePerSqm = Number(property.basePrice) / property.squareMeters;
    }

    const currentTrend = history[history.length - 1]?.marketTrend || MarketTrend.STABLE;

    return {
      propertyId: dto.propertyId,
      history: history.map((h) => ({
        price: Number(h.price),
        pricePerSqm: h.pricePerSqm ? Number(h.pricePerSqm) : undefined,
        eventType: h.eventType,
        eventDate: h.eventDate,
        daysOnMarket: h.daysOnMarket ?? undefined,
        marketTrend: h.marketTrend ?? undefined,
      })),
      priceChangePercent,
      avgPricePerSqm,
      currentTrend,
    };
  }

  // ============================================
  // PROD-162: Investment Calculators - ROI
  // ============================================

  calculateRoi(input: RoiCalculatorInputDto): RoiCalculatorResultDto {
    const {
      purchasePrice,
      downPayment = purchasePrice * 0.2,
      closingCosts = purchasePrice * 0.03,
      renovationCosts = 0,
      monthlyRent,
      annualPropertyTax = purchasePrice * 0.012,
      annualInsurance = purchasePrice * 0.005,
      monthlyHoa = 0,
      annualMaintenance = monthlyRent * 12 * 0.1,
      vacancyRate = 5,
      managementFeeRate = 10,
      interestRate = 7,
      loanTermYears = 30,
    } = input;

    // Calculate loan details
    const loanAmount = purchasePrice - downPayment;
    const monthlyMortgage = this.calculateMonthlyPayment(loanAmount, interestRate, loanTermYears);

    // Calculate income
    const annualGrossIncome = monthlyRent * 12;
    const effectiveGrossIncome = annualGrossIncome * (1 - vacancyRate / 100);

    // Calculate expenses
    const managementFee = effectiveGrossIncome * (managementFeeRate / 100);
    const annualOperatingExpenses =
      annualPropertyTax +
      annualInsurance +
      monthlyHoa * 12 +
      annualMaintenance +
      managementFee;

    // Net Operating Income (NOI)
    const netOperatingIncome = effectiveGrossIncome - annualOperatingExpenses;

    // Cash flow after mortgage
    const annualMortgage = monthlyMortgage * 12;
    const annualCashFlow = netOperatingIncome - annualMortgage;
    const monthlyCashFlow = annualCashFlow / 12;

    // Total investment
    const totalInvestment = downPayment + closingCosts + renovationCosts;

    // Key metrics
    const capRate = (netOperatingIncome / purchasePrice) * 100;
    const cashOnCashReturn = (annualCashFlow / totalInvestment) * 100;
    const roi = cashOnCashReturn; // First year ROI equals cash-on-cash
    const grossRentMultiplier = purchasePrice / annualGrossIncome;

    return {
      totalInvestment: Math.round(totalInvestment * 100) / 100,
      loanAmount: Math.round(loanAmount * 100) / 100,
      monthlyMortgage: Math.round(monthlyMortgage * 100) / 100,
      annualGrossIncome: Math.round(effectiveGrossIncome * 100) / 100,
      annualOperatingExpenses: Math.round(annualOperatingExpenses * 100) / 100,
      netOperatingIncome: Math.round(netOperatingIncome * 100) / 100,
      annualCashFlow: Math.round(annualCashFlow * 100) / 100,
      monthlyCashFlow: Math.round(monthlyCashFlow * 100) / 100,
      capRate: Math.round(capRate * 100) / 100,
      cashOnCashReturn: Math.round(cashOnCashReturn * 100) / 100,
      roi: Math.round(roi * 100) / 100,
      grossRentMultiplier: Math.round(grossRentMultiplier * 100) / 100,
    };
  }

  // ============================================
  // PROD-162: Investment Calculators - Mortgage
  // ============================================

  calculateMortgage(input: MortgageCalculatorInputDto): MortgageCalculatorResultDto {
    const {
      principal,
      interestRate,
      loanTermYears,
      includePmi = false,
      annualPropertyTax = 0,
      annualInsurance = 0,
    } = input;

    const monthlyPrincipalInterest = this.calculateMonthlyPayment(
      principal,
      interestRate,
      loanTermYears,
    );

    // PMI typically applies if down payment < 20%
    const monthlyPmi = includePmi ? (principal * 0.005) / 12 : 0;

    const monthlyPropertyTax = annualPropertyTax / 12;
    const monthlyInsurance = annualInsurance / 12;

    const totalMonthlyPayment =
      monthlyPrincipalInterest + monthlyPmi + monthlyPropertyTax + monthlyInsurance;

    const totalPayments = loanTermYears * 12;
    const totalCost = monthlyPrincipalInterest * totalPayments;
    const totalInterest = totalCost - principal;

    // Generate amortization summary by year
    const amortizationSummary = this.generateAmortizationSummary(
      principal,
      interestRate,
      loanTermYears,
    );

    return {
      monthlyPrincipalInterest: Math.round(monthlyPrincipalInterest * 100) / 100,
      monthlyPmi: monthlyPmi > 0 ? Math.round(monthlyPmi * 100) / 100 : undefined,
      monthlyPropertyTax:
        monthlyPropertyTax > 0 ? Math.round(monthlyPropertyTax * 100) / 100 : undefined,
      monthlyInsurance:
        monthlyInsurance > 0 ? Math.round(monthlyInsurance * 100) / 100 : undefined,
      totalMonthlyPayment: Math.round(totalMonthlyPayment * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      amortizationSummary,
    };
  }

  private calculateMonthlyPayment(
    principal: number,
    annualRate: number,
    years: number,
  ): number {
    if (principal <= 0) return 0;
    if (annualRate <= 0) return principal / (years * 12);

    const monthlyRate = annualRate / 100 / 12;
    const numberOfPayments = years * 12;

    const monthlyPayment =
      (principal * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
      (Math.pow(1 + monthlyRate, numberOfPayments) - 1);

    return monthlyPayment;
  }

  private generateAmortizationSummary(
    principal: number,
    annualRate: number,
    years: number,
  ): {
    year: number;
    principalPaid: number;
    interestPaid: number;
    remainingBalance: number;
  }[] {
    const monthlyRate = annualRate / 100 / 12;
    const monthlyPayment = this.calculateMonthlyPayment(principal, annualRate, years);
    const summary = [];

    let balance = principal;

    for (let year = 1; year <= years; year++) {
      let yearlyPrincipal = 0;
      let yearlyInterest = 0;

      for (let month = 0; month < 12; month++) {
        if (balance <= 0) break;

        const interestPayment = balance * monthlyRate;
        const principalPayment = Math.min(monthlyPayment - interestPayment, balance);

        yearlyInterest += interestPayment;
        yearlyPrincipal += principalPayment;
        balance -= principalPayment;
      }

      summary.push({
        year,
        principalPaid: Math.round(yearlyPrincipal * 100) / 100,
        interestPaid: Math.round(yearlyInterest * 100) / 100,
        remainingBalance: Math.max(0, Math.round(balance * 100) / 100),
      });

      if (balance <= 0) break;
    }

    return summary;
  }

  // ============================================
  // PROD-163: Rental Yield Calculator
  // ============================================

  calculateRentalYield(input: RentalYieldInputDto): RentalYieldResultDto {
    const { purchasePrice, monthlyRent, annualExpenses = 0 } = input;

    if (purchasePrice <= 0) {
      throw new BadRequestException('Purchase price must be greater than 0');
    }

    const annualGrossIncome = monthlyRent * 12;
    const annualNetIncome = annualGrossIncome - annualExpenses;

    const grossYield = (annualGrossIncome / purchasePrice) * 100;
    const netYield = (annualNetIncome / purchasePrice) * 100;

    return {
      grossYield: Math.round(grossYield * 100) / 100,
      netYield: Math.round(netYield * 100) / 100,
      annualGrossIncome: Math.round(annualGrossIncome * 100) / 100,
      annualNetIncome: Math.round(annualNetIncome * 100) / 100,
    };
  }

  // ============================================
  // PROD-164: Depreciation Calculator
  // ============================================

  calculateDepreciation(input: DepreciationInputDto): DepreciationResultDto {
    const {
      purchasePrice,
      landValue = purchasePrice * 0.2, // Default 20% for land
      propertyType,
      startDate: _startDate = new Date().toISOString(),
      improvementCosts = 0,
    } = input;

    // IRS depreciation periods
    const depreciationYears = this.getDepreciationYears(propertyType);

    // Depreciable basis = Purchase price - Land value + Improvements
    const depreciableBasis = purchasePrice - landValue + improvementCosts;

    // Annual depreciation
    const annualDepreciation = depreciableBasis / depreciationYears;
    const monthlyDepreciation = annualDepreciation / 12;

    // Generate 5-year schedule
    const schedule = [];
    let accumulated = 0;

    for (let year = 1; year <= 5; year++) {
      accumulated += annualDepreciation;
      schedule.push({
        year,
        depreciation: Math.round(annualDepreciation * 100) / 100,
        accumulatedDepreciation: Math.round(accumulated * 100) / 100,
        remainingBasis: Math.round((depreciableBasis - accumulated) * 100) / 100,
      });
    }

    return {
      depreciableBasis: Math.round(depreciableBasis * 100) / 100,
      depreciationYears,
      annualDepreciation: Math.round(annualDepreciation * 100) / 100,
      monthlyDepreciation: Math.round(monthlyDepreciation * 100) / 100,
      schedule,
    };
  }

  private getDepreciationYears(propertyType: FinancialPropertyType): number {
    switch (propertyType) {
      case FinancialPropertyType.RESIDENTIAL_SINGLE:
      case FinancialPropertyType.RESIDENTIAL_MULTI:
        return 27; // 27.5 years for residential rounded
      case FinancialPropertyType.COMMERCIAL:
      case FinancialPropertyType.INDUSTRIAL:
      case FinancialPropertyType.MIXED_USE:
        return 39;
      default:
        return 27;
    }
  }

  // ============================================
  // PROD-165: Portfolio Tracker
  // ============================================

  async createPortfolio(userId: string, dto: CreatePortfolioDto): Promise<PortfolioResponseDto> {
    const portfolio = await this.prisma.investmentPortfolio.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
      },
      include: {
        properties: {
          include: { property: true },
        },
      },
    });

    return this.mapPortfolioToResponse(portfolio);
  }

  async getPortfolios(userId: string): Promise<PortfolioResponseDto[]> {
    const portfolios = await this.prisma.investmentPortfolio.findMany({
      where: { userId },
      include: {
        properties: {
          include: { property: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return portfolios.map((p) => this.mapPortfolioToResponse(p));
  }

  async getPortfolioById(portfolioId: string, userId: string): Promise<PortfolioResponseDto> {
    const portfolio = await this.prisma.investmentPortfolio.findFirst({
      where: { id: portfolioId, userId },
      include: {
        properties: {
          include: { property: true },
        },
      },
    });

    if (!portfolio) {
      throw new NotFoundException(`Portfolio ${portfolioId} not found`);
    }

    // Recalculate metrics
    await this.recalculatePortfolioMetrics(portfolioId);

    const updated = await this.prisma.investmentPortfolio.findUnique({
      where: { id: portfolioId },
      include: {
        properties: {
          include: { property: true },
        },
      },
    });

    return this.mapPortfolioToResponse(updated!);
  }

  async updatePortfolio(
    portfolioId: string,
    userId: string,
    dto: UpdatePortfolioDto,
  ): Promise<PortfolioResponseDto> {
    const existing = await this.prisma.investmentPortfolio.findFirst({
      where: { id: portfolioId, userId },
    });

    if (!existing) {
      throw new NotFoundException(`Portfolio ${portfolioId} not found`);
    }

    const portfolio = await this.prisma.investmentPortfolio.update({
      where: { id: portfolioId },
      data: dto,
      include: {
        properties: {
          include: { property: true },
        },
      },
    });

    return this.mapPortfolioToResponse(portfolio);
  }

  async deletePortfolio(portfolioId: string, userId: string): Promise<void> {
    const existing = await this.prisma.investmentPortfolio.findFirst({
      where: { id: portfolioId, userId },
    });

    if (!existing) {
      throw new NotFoundException(`Portfolio ${portfolioId} not found`);
    }

    await this.prisma.investmentPortfolio.delete({
      where: { id: portfolioId },
    });
  }

  async addPropertyToPortfolio(
    portfolioId: string,
    userId: string,
    dto: AddPropertyToPortfolioDto,
  ): Promise<PortfolioResponseDto> {
    const portfolio = await this.prisma.investmentPortfolio.findFirst({
      where: { id: portfolioId, userId },
    });

    if (!portfolio) {
      throw new NotFoundException(`Portfolio ${portfolioId} not found`);
    }

    const property = await this.prisma.property.findUnique({
      where: { id: dto.propertyId },
    });

    if (!property) {
      throw new NotFoundException(`Property ${dto.propertyId} not found`);
    }

    // Check if property already in portfolio
    const existing = await this.prisma.portfolioProperty.findUnique({
      where: {
        portfolioId_propertyId: {
          portfolioId,
          propertyId: dto.propertyId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Property already in portfolio');
    }

    // Calculate monthly mortgage if loan details provided
    let monthlyPayment: number | undefined;
    if (dto.loanAmount && dto.interestRate && dto.loanTermYears) {
      monthlyPayment = this.calculateMonthlyPayment(
        dto.loanAmount,
        dto.interestRate,
        dto.loanTermYears,
      );
    }

    await this.prisma.portfolioProperty.create({
      data: {
        portfolioId,
        propertyId: dto.propertyId,
        purchasePrice: new Prisma.Decimal(dto.purchasePrice),
        purchaseDate: new Date(dto.purchaseDate),
        closingCosts: dto.closingCosts ? new Prisma.Decimal(dto.closingCosts) : null,
        renovationCosts: dto.renovationCosts ? new Prisma.Decimal(dto.renovationCosts) : null,
        downPayment: dto.downPayment ? new Prisma.Decimal(dto.downPayment) : null,
        loanAmount: dto.loanAmount ? new Prisma.Decimal(dto.loanAmount) : null,
        interestRate: dto.interestRate,
        loanTermYears: dto.loanTermYears,
        monthlyPayment: monthlyPayment ? new Prisma.Decimal(monthlyPayment) : null,
        monthlyRent: dto.monthlyRent ? new Prisma.Decimal(dto.monthlyRent) : null,
        depreciationType: dto.depreciationType,
        landValue: dto.landValue ? new Prisma.Decimal(dto.landValue) : null,
        depreciationStartDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
        depreciationYears: dto.depreciationType
          ? this.getDepreciationYears(dto.depreciationType)
          : null,
      },
    });

    // Recalculate portfolio metrics
    await this.recalculatePortfolioMetrics(portfolioId);

    return this.getPortfolioById(portfolioId, userId);
  }

  async removePropertyFromPortfolio(
    portfolioId: string,
    propertyId: string,
    userId: string,
  ): Promise<void> {
    const portfolio = await this.prisma.investmentPortfolio.findFirst({
      where: { id: portfolioId, userId },
    });

    if (!portfolio) {
      throw new NotFoundException(`Portfolio ${portfolioId} not found`);
    }

    const entry = await this.prisma.portfolioProperty.findUnique({
      where: {
        portfolioId_propertyId: {
          portfolioId,
          propertyId,
        },
      },
    });

    if (!entry) {
      throw new NotFoundException('Property not found in portfolio');
    }

    await this.prisma.portfolioProperty.delete({
      where: { id: entry.id },
    });

    await this.recalculatePortfolioMetrics(portfolioId);
  }

  private async recalculatePortfolioMetrics(portfolioId: string): Promise<void> {
    const properties = await this.prisma.portfolioProperty.findMany({
      where: { portfolioId },
    });

    let totalValue = 0;
    let totalEquity = 0;
    let totalIncome = 0;
    let totalExpenses = 0;
    let totalInvestment = 0;

    for (const prop of properties) {
      const currentValue = Number(prop.currentValue || prop.purchasePrice);
      const loanAmount = Number(prop.loanAmount || 0);
      const monthlyRent = Number(prop.monthlyRent || 0);
      const monthlyPayment = Number(prop.monthlyPayment || 0);
      const downPayment = Number(prop.downPayment || 0);
      const closingCosts = Number(prop.closingCosts || 0);
      const renovationCosts = Number(prop.renovationCosts || 0);

      totalValue += currentValue;
      totalEquity += currentValue - loanAmount;
      totalIncome += monthlyRent * 12;
      totalExpenses += monthlyPayment * 12;
      totalInvestment += downPayment + closingCosts + renovationCosts;
    }

    const cashFlow = totalIncome - totalExpenses;
    const overallRoi = totalInvestment > 0 ? (cashFlow / totalInvestment) * 100 : 0;
    const cashOnCash = totalInvestment > 0 ? (cashFlow / totalInvestment) * 100 : 0;

    await this.prisma.investmentPortfolio.update({
      where: { id: portfolioId },
      data: {
        totalValue: new Prisma.Decimal(totalValue),
        totalEquity: new Prisma.Decimal(totalEquity),
        totalIncome: new Prisma.Decimal(totalIncome),
        totalExpenses: new Prisma.Decimal(totalExpenses),
        cashFlow: new Prisma.Decimal(cashFlow),
        overallRoi,
        cashOnCash,
        lastCalculatedAt: new Date(),
      },
    });
  }

  private mapPortfolioToResponse(portfolio: any): PortfolioResponseDto {
    return {
      id: portfolio.id,
      name: portfolio.name,
      description: portfolio.description,
      propertyCount: portfolio.properties?.length || 0,
      totalValue: portfolio.totalValue ? Number(portfolio.totalValue) : undefined,
      totalEquity: portfolio.totalEquity ? Number(portfolio.totalEquity) : undefined,
      totalIncome: portfolio.totalIncome ? Number(portfolio.totalIncome) : undefined,
      totalExpenses: portfolio.totalExpenses ? Number(portfolio.totalExpenses) : undefined,
      cashFlow: portfolio.cashFlow ? Number(portfolio.cashFlow) : undefined,
      overallRoi: portfolio.overallRoi,
      cashOnCash: portfolio.cashOnCash,
      properties:
        portfolio.properties?.map((pp: any) => ({
          id: pp.id,
          propertyId: pp.propertyId,
          propertyAddress: pp.property?.address || 'Unknown',
          purchasePrice: Number(pp.purchasePrice),
          purchaseDate: pp.purchaseDate,
          currentValue: pp.currentValue ? Number(pp.currentValue) : undefined,
          equity: pp.currentValue && pp.loanAmount
            ? Number(pp.currentValue) - Number(pp.loanAmount)
            : undefined,
          monthlyRent: pp.monthlyRent ? Number(pp.monthlyRent) : undefined,
          monthlyCashFlow:
            pp.monthlyRent && pp.monthlyPayment
              ? Number(pp.monthlyRent) - Number(pp.monthlyPayment)
              : undefined,
        })) || [],
      createdAt: portfolio.createdAt,
      updatedAt: portfolio.updatedAt,
    };
  }

  // ============================================
  // PROD-166: Loan Comparison
  // ============================================

  compareLoanOptions(input: LoanComparisonInputDto): LoanComparisonResultDto[] {
    const results: (LoanComparisonResultDto & { totalUpfront: number })[] = input.loans.map((loan) => {
      const monthlyPayment = this.calculateMonthlyPayment(
        loan.loanAmount,
        loan.interestRate,
        loan.loanTermYears,
      );

      const totalPayments = monthlyPayment * loan.loanTermYears * 12;
      const totalInterest = totalPayments - loan.loanAmount;

      const upfrontCosts =
        (loan.originationFee || 0) +
        (loan.closingCosts || 0) +
        ((loan.points || 0) * loan.loanAmount) / 100;

      const totalCost = totalPayments + upfrontCosts;

      // Calculate effective rate (APR approximation)
      const effectiveRate =
        ((totalInterest + upfrontCosts) / loan.loanAmount / loan.loanTermYears) * 100;

      return {
        lenderName: loan.lenderName,
        monthlyPayment: Math.round(monthlyPayment * 100) / 100,
        totalInterest: Math.round(totalInterest * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        effectiveRate: Math.round(effectiveRate * 100) / 100,
        rank: 0,
        totalUpfront: upfrontCosts,
      };
    });

    // Sort by total cost and assign ranks
    results.sort((a, b) => a.totalCost - b.totalCost);
    results.forEach((r, i) => (r.rank = i + 1));

    // Calculate break-even months between options
    if (results.length >= 2) {
      for (let i = 1; i < results.length; i++) {
        const upfrontDiff = results[i].totalUpfront - results[0].totalUpfront;
        const monthlyDiff = results[0].monthlyPayment - results[i].monthlyPayment;

        if (monthlyDiff > 0) {
          results[i].breakEvenMonths = Math.ceil(upfrontDiff / monthlyDiff);
        }
      }
    }

    // Remove internal field before returning
    return results.map(({ totalUpfront: _totalUpfront, ...rest }) => rest);
  }

  // ============================================
  // PROD-167: Down Payment Assistance Programs
  // ============================================

  async findDownPaymentPrograms(
    query: DownPaymentProgramQueryDto,
  ): Promise<DownPaymentProgramResponseDto[]> {
    const where: Prisma.DownPaymentProgramWhereInput = {
      isActive: true,
    };

    if (query.state) {
      where.OR = [{ state: query.state }, { state: 'FEDERAL' }, { state: null }];
    }

    if (query.city) {
      where.OR = [
        ...(where.OR || []),
        { city: query.city },
        { city: null },
      ];
    }

    const programs = await this.prisma.downPaymentProgram.findMany({
      where,
      orderBy: [{ state: 'asc' }, { name: 'asc' }],
    });

    return programs.map((p) => {
      let isEligible = true;

      // Check income eligibility
      if (query.income && p.maxIncome) {
        isEligible = isEligible && query.income <= Number(p.maxIncome);
      }

      // Check purchase price eligibility
      if (query.purchasePrice && p.maxPurchasePrice) {
        isEligible = isEligible && query.purchasePrice <= Number(p.maxPurchasePrice);
      }

      // Check first-time buyer requirement
      if (p.firstTimeBuyer && query.firstTimeBuyer === false) {
        isEligible = false;
      }

      // Check credit score
      if (query.creditScore && p.minCreditScore) {
        isEligible = isEligible && query.creditScore >= p.minCreditScore;
      }

      return {
        id: p.id,
        name: p.name,
        description: p.description || undefined,
        programType: p.programType,
        state: p.state || undefined,
        maxAmount: p.maxAmount ? Number(p.maxAmount) : undefined,
        percentageOfPrice: p.percentageOfPrice || undefined,
        applicationUrl: p.applicationUrl || undefined,
        deadline: p.deadline || undefined,
        isEligible,
      };
    });
  }

  // ============================================
  // PROD-168: Tax Reporting
  // ============================================

  async generateTaxReport(userId: string, dto: GenerateTaxReportDto): Promise<TaxReportResponseDto> {
    const startDate = new Date(dto.taxYear, 0, 1);
    const endDate = new Date(dto.taxYear, 11, 31);

    // Check if report already exists
    let report = await this.prisma.taxReport.findUnique({
      where: {
        userId_taxYear: {
          userId,
          taxYear: dto.taxYear,
        },
      },
    });

    if (report) {
      return this.mapTaxReportToResponse(report);
    }

    // Get user's properties from portfolio
    const portfolioProperties = await this.prisma.portfolioProperty.findMany({
      where: {
        portfolio: { userId },
        purchaseDate: { lte: endDate },
      },
      include: {
        property: true,
      },
    });

    // Get expenses for the tax year
    const expenses = await this.prisma.expense.findMany({
      where: {
        landlordId: userId,
        expenseDate: { gte: startDate, lte: endDate },
      },
    });

    // Get rent payments received
    const leases = await this.prisma.lease.findMany({
      where: { landlordId: userId },
      include: {
        rentPayments: {
          where: {
            paidAt: { gte: startDate, lte: endDate },
            status: 'PAID',
          },
        },
      },
    });

    // Calculate totals
    let rentalIncome = 0;
    leases.forEach((lease) => {
      lease.rentPayments.forEach((payment) => {
        rentalIncome += Number(payment.paidAmount || payment.amount);
      });
    });

    // Categorize expenses
    let mortgageInterest = 0;
    let propertyTaxes = 0;
    let insurance = 0;
    let repairs = 0;
    let maintenance = 0;
    let utilities = 0;
    let management = 0;
    let professional = 0;
    let otherExpenses = 0;

    expenses.forEach((exp) => {
      const amount = Number(exp.amount);
      switch (exp.category) {
        case 'MORTGAGE':
          mortgageInterest += amount;
          break;
        case 'TAXES':
          propertyTaxes += amount;
          break;
        case 'INSURANCE':
          insurance += amount;
          break;
        case 'MAINTENANCE':
          repairs += amount * 0.5; // Split between repairs and maintenance
          maintenance += amount * 0.5;
          break;
        case 'UTILITIES':
          utilities += amount;
          break;
        case 'MANAGEMENT_FEES':
          management += amount;
          break;
        case 'LEGAL':
          professional += amount;
          break;
        default:
          otherExpenses += amount;
      }
    });

    // Calculate depreciation
    let depreciation = 0;
    portfolioProperties.forEach((pp) => {
      if (pp.depreciationType && pp.depreciationYears) {
        const depreciableBasis =
          Number(pp.purchasePrice) - Number(pp.landValue || 0);
        depreciation += depreciableBasis / pp.depreciationYears;
      }
    });

    const totalExpenses =
      mortgageInterest +
      propertyTaxes +
      insurance +
      repairs +
      maintenance +
      utilities +
      management +
      professional +
      depreciation +
      otherExpenses;

    const netIncome = rentalIncome - totalExpenses;

    // Create report
    report = await this.prisma.taxReport.create({
      data: {
        userId,
        taxYear: dto.taxYear,
        startDate,
        endDate,
        rentalIncome: new Prisma.Decimal(rentalIncome),
        totalIncome: new Prisma.Decimal(rentalIncome),
        mortgageInterest: new Prisma.Decimal(mortgageInterest),
        propertyTaxes: new Prisma.Decimal(propertyTaxes),
        insurance: new Prisma.Decimal(insurance),
        repairs: new Prisma.Decimal(repairs),
        maintenance: new Prisma.Decimal(maintenance),
        utilities: new Prisma.Decimal(utilities),
        management: new Prisma.Decimal(management),
        professional: new Prisma.Decimal(professional),
        depreciation: new Prisma.Decimal(depreciation),
        otherExpenses: new Prisma.Decimal(otherExpenses),
        totalExpenses: new Prisma.Decimal(totalExpenses),
        netIncome: new Prisma.Decimal(netIncome),
        status: 'DRAFT',
      },
    });

    return this.mapTaxReportToResponse(report);
  }

  async getTaxReports(userId: string): Promise<TaxReportResponseDto[]> {
    const reports = await this.prisma.taxReport.findMany({
      where: { userId },
      orderBy: { taxYear: 'desc' },
    });

    return reports.map((r) => this.mapTaxReportToResponse(r));
  }

  private mapTaxReportToResponse(report: any): TaxReportResponseDto {
    return {
      id: report.id,
      taxYear: report.taxYear,
      startDate: report.startDate,
      endDate: report.endDate,
      income: {
        rentalIncome: Number(report.rentalIncome),
        otherIncome: Number(report.otherIncome),
        totalIncome: Number(report.totalIncome),
      },
      expenses: {
        mortgageInterest: Number(report.mortgageInterest),
        propertyTaxes: Number(report.propertyTaxes),
        insurance: Number(report.insurance),
        repairs: Number(report.repairs),
        maintenance: Number(report.maintenance),
        utilities: Number(report.utilities),
        management: Number(report.management),
        professional: Number(report.professional),
        depreciation: Number(report.depreciation),
        otherExpenses: Number(report.otherExpenses),
        totalExpenses: Number(report.totalExpenses),
      },
      netIncome: Number(report.netIncome),
      propertyDetails: report.propertyDetails as any,
      status: report.status,
      createdAt: report.createdAt,
    };
  }

  // ============================================
  // PROD-169: Cash Flow Projection
  // ============================================

  async createCashFlowProjection(
    dto: CashFlowProjectionInputDto,
  ): Promise<CashFlowProjectionResponseDto> {
    const property = await this.prisma.property.findUnique({
      where: { id: dto.propertyId },
    });

    if (!property) {
      throw new NotFoundException(`Property ${dto.propertyId} not found`);
    }

    const {
      projectionMonths = 12,
      vacancyRate = 5,
      rentGrowthRate = 2,
      expenseGrowthRate = 3,
      monthlyRent,
      monthlyExpenses,
    } = dto;

    const projections: MonthlyProjectionDto[] = [];
    let cumulativeCashFlow = 0;
    let totalIncome = 0;
    let totalExpenses = 0;

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    const currentMonth = new Date().getMonth();

    for (let i = 0; i < projectionMonths; i++) {
      const monthIndex = (currentMonth + i) % 12;
      const yearOffset = Math.floor((currentMonth + i) / 12);

      // Apply growth rates (compounded annually)
      const annualRentMultiplier = Math.pow(1 + rentGrowthRate / 100, yearOffset);
      const annualExpenseMultiplier = Math.pow(1 + expenseGrowthRate / 100, yearOffset);

      // Calculate monthly values
      const effectiveRent = monthlyRent * annualRentMultiplier * (1 - vacancyRate / 100);
      const effectiveExpenses = monthlyExpenses * annualExpenseMultiplier;
      const netCashFlow = effectiveRent - effectiveExpenses;

      cumulativeCashFlow += netCashFlow;
      totalIncome += effectiveRent;
      totalExpenses += effectiveExpenses;

      projections.push({
        month: i + 1,
        monthName: monthNames[monthIndex],
        income: Math.round(effectiveRent * 100) / 100,
        expenses: Math.round(effectiveExpenses * 100) / 100,
        netCashFlow: Math.round(netCashFlow * 100) / 100,
        cumulativeCashFlow: Math.round(cumulativeCashFlow * 100) / 100,
      });
    }

    const totalCashFlow = totalIncome - totalExpenses;
    const avgMonthlyCashFlow = totalCashFlow / projectionMonths;

    // Save projection to database
    const projection = await this.prisma.cashFlowProjection.create({
      data: {
        propertyId: dto.propertyId,
        projectionMonths,
        vacancyRate,
        rentGrowthRate,
        expenseGrowthRate,
        projections: projections as unknown as Prisma.InputJsonValue,
        totalProjectedIncome: new Prisma.Decimal(totalIncome),
        totalProjectedExpenses: new Prisma.Decimal(totalExpenses),
        totalProjectedCashFlow: new Prisma.Decimal(totalCashFlow),
        averageMonthlyCashFlow: new Prisma.Decimal(avgMonthlyCashFlow),
        baseMonthlyRent: new Prisma.Decimal(monthlyRent),
        baseMonthlyExpense: new Prisma.Decimal(monthlyExpenses),
      },
    });

    return {
      id: projection.id,
      propertyId: projection.propertyId,
      projectionMonths: projection.projectionMonths,
      vacancyRate: projection.vacancyRate,
      rentGrowthRate: projection.rentGrowthRate,
      expenseGrowthRate: projection.expenseGrowthRate,
      projections,
      totalProjectedIncome: Math.round(totalIncome * 100) / 100,
      totalProjectedExpenses: Math.round(totalExpenses * 100) / 100,
      totalProjectedCashFlow: Math.round(totalCashFlow * 100) / 100,
      averageMonthlyCashFlow: Math.round(avgMonthlyCashFlow * 100) / 100,
      createdAt: projection.createdAt,
    };
  }

  async getCashFlowProjections(propertyId: string): Promise<CashFlowProjectionResponseDto[]> {
    const projections = await this.prisma.cashFlowProjection.findMany({
      where: { propertyId },
      orderBy: { createdAt: 'desc' },
    });

    return projections.map((p) => ({
      id: p.id,
      propertyId: p.propertyId,
      projectionMonths: p.projectionMonths,
      vacancyRate: p.vacancyRate,
      rentGrowthRate: p.rentGrowthRate,
      expenseGrowthRate: p.expenseGrowthRate,
      projections: p.projections as unknown as MonthlyProjectionDto[],
      totalProjectedIncome: Number(p.totalProjectedIncome),
      totalProjectedExpenses: Number(p.totalProjectedExpenses),
      totalProjectedCashFlow: Number(p.totalProjectedCashFlow),
      averageMonthlyCashFlow: Number(p.averageMonthlyCashFlow),
      createdAt: p.createdAt,
    }));
  }
}
