import {
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  IsEnum,
  IsArray,
  Min,
  Max,
  IsInt,
  IsDateString,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FinancialPropertyType, MarketTrend } from '@prisma/client';

// ============================================
// PROD-160: AI Property Valuation
// ============================================

export class PropertyValuationRequestDto {
  @ApiProperty({ description: 'Property ID to valuate' })
  @IsUUID()
  propertyId: string;

  @ApiPropertyOptional({ description: 'Valuation method', enum: ['COMPARABLE', 'INCOME', 'COST'] })
  @IsOptional()
  @IsString()
  method?: 'COMPARABLE' | 'INCOME' | 'COST';
}

export class ComparableSaleDto {
  @ApiProperty()
  address: string;

  @ApiProperty()
  price: number;

  @ApiProperty()
  squareMeters: number;

  @ApiProperty()
  soldDate: string;

  @ApiPropertyOptional()
  bedrooms?: number;

  @ApiPropertyOptional()
  bathrooms?: number;

  @ApiPropertyOptional()
  distanceKm?: number;
}

export class PropertyValuationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  propertyId: string;

  @ApiProperty({ description: 'Estimated property value' })
  estimatedValue: number;

  @ApiProperty({ description: 'Low end of confidence range' })
  confidenceLow: number;

  @ApiProperty({ description: 'High end of confidence range' })
  confidenceHigh: number;

  @ApiProperty({ description: 'Confidence level 0-100' })
  confidenceLevel: number;

  @ApiPropertyOptional({ type: [ComparableSaleDto] })
  comparableSales?: ComparableSaleDto[];

  @ApiPropertyOptional()
  marketData?: {
    trend: string;
    avgPricePerSqm: number;
    inventory: number;
  };

  @ApiProperty()
  valuationMethod: string;

  @ApiProperty()
  createdAt: Date;
}

// ============================================
// PROD-161: Price Analytics
// ============================================

export class PriceHistoryQueryDto {
  @ApiProperty({ description: 'Property ID' })
  @IsUUID()
  propertyId: string;

  @ApiPropertyOptional({ description: 'Start date for history' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for history' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class PriceHistoryEntryDto {
  @ApiProperty()
  price: number;

  @ApiPropertyOptional()
  pricePerSqm?: number;

  @ApiProperty({ description: 'Event type: LISTED, REDUCED, INCREASED, SOLD, RENTED' })
  eventType: string;

  @ApiProperty()
  eventDate: Date;

  @ApiPropertyOptional()
  daysOnMarket?: number;

  @ApiPropertyOptional({ enum: MarketTrend })
  marketTrend?: MarketTrend;
}

export class PriceAnalyticsResponseDto {
  @ApiProperty()
  propertyId: string;

  @ApiProperty({ type: [PriceHistoryEntryDto] })
  history: PriceHistoryEntryDto[];

  @ApiPropertyOptional({ description: 'Price change percentage over period' })
  priceChangePercent?: number;

  @ApiPropertyOptional({ description: 'Average price per sqm' })
  avgPricePerSqm?: number;

  @ApiPropertyOptional({ description: 'Current market trend', enum: MarketTrend })
  currentTrend?: MarketTrend;
}

// ============================================
// PROD-162: Investment Calculators
// ============================================

export class RoiCalculatorInputDto {
  @ApiProperty({ description: 'Purchase price' })
  @IsNumber()
  @Min(0)
  purchasePrice: number;

  @ApiPropertyOptional({ description: 'Down payment amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  downPayment?: number;

  @ApiPropertyOptional({ description: 'Closing costs' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  closingCosts?: number;

  @ApiPropertyOptional({ description: 'Renovation costs' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  renovationCosts?: number;

  @ApiProperty({ description: 'Monthly rental income' })
  @IsNumber()
  @Min(0)
  monthlyRent: number;

  @ApiPropertyOptional({ description: 'Annual property tax' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  annualPropertyTax?: number;

  @ApiPropertyOptional({ description: 'Annual insurance' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  annualInsurance?: number;

  @ApiPropertyOptional({ description: 'Monthly HOA fees' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyHoa?: number;

  @ApiPropertyOptional({ description: 'Annual maintenance estimate' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  annualMaintenance?: number;

  @ApiPropertyOptional({ description: 'Vacancy rate percentage (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  vacancyRate?: number;

  @ApiPropertyOptional({ description: 'Management fee percentage (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  managementFeeRate?: number;

  @ApiPropertyOptional({ description: 'Loan interest rate percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(30)
  interestRate?: number;

  @ApiPropertyOptional({ description: 'Loan term in years' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(40)
  loanTermYears?: number;
}

export class RoiCalculatorResultDto {
  @ApiProperty({ description: 'Total investment (down + closing + reno)' })
  totalInvestment: number;

  @ApiProperty({ description: 'Loan amount' })
  loanAmount: number;

  @ApiProperty({ description: 'Monthly mortgage payment' })
  monthlyMortgage: number;

  @ApiProperty({ description: 'Annual gross rental income' })
  annualGrossIncome: number;

  @ApiProperty({ description: 'Annual operating expenses' })
  annualOperatingExpenses: number;

  @ApiProperty({ description: 'Net operating income (NOI)' })
  netOperatingIncome: number;

  @ApiProperty({ description: 'Annual cash flow after mortgage' })
  annualCashFlow: number;

  @ApiProperty({ description: 'Monthly cash flow' })
  monthlyCashFlow: number;

  @ApiProperty({ description: 'Cap rate percentage' })
  capRate: number;

  @ApiProperty({ description: 'Cash-on-cash return percentage' })
  cashOnCashReturn: number;

  @ApiProperty({ description: 'ROI percentage (first year)' })
  roi: number;

  @ApiProperty({ description: 'Gross rent multiplier' })
  grossRentMultiplier: number;
}

export class MortgageCalculatorInputDto {
  @ApiProperty({ description: 'Loan principal amount' })
  @IsNumber()
  @Min(0)
  principal: number;

  @ApiProperty({ description: 'Annual interest rate percentage' })
  @IsNumber()
  @Min(0)
  @Max(30)
  interestRate: number;

  @ApiProperty({ description: 'Loan term in years' })
  @IsInt()
  @Min(1)
  @Max(40)
  loanTermYears: number;

  @ApiPropertyOptional({ description: 'Include PMI if down payment < 20%' })
  @IsOptional()
  @IsBoolean()
  includePmi?: boolean;

  @ApiPropertyOptional({ description: 'Annual property tax for escrow' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  annualPropertyTax?: number;

  @ApiPropertyOptional({ description: 'Annual insurance for escrow' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  annualInsurance?: number;
}

export class MortgageCalculatorResultDto {
  @ApiProperty({ description: 'Monthly principal and interest' })
  monthlyPrincipalInterest: number;

  @ApiPropertyOptional({ description: 'Monthly PMI' })
  monthlyPmi?: number;

  @ApiPropertyOptional({ description: 'Monthly property tax escrow' })
  monthlyPropertyTax?: number;

  @ApiPropertyOptional({ description: 'Monthly insurance escrow' })
  monthlyInsurance?: number;

  @ApiProperty({ description: 'Total monthly payment' })
  totalMonthlyPayment: number;

  @ApiProperty({ description: 'Total interest over loan life' })
  totalInterest: number;

  @ApiProperty({ description: 'Total cost of loan' })
  totalCost: number;

  @ApiProperty({ description: 'Amortization schedule summary' })
  amortizationSummary: {
    year: number;
    principalPaid: number;
    interestPaid: number;
    remainingBalance: number;
  }[];
}

// ============================================
// PROD-163: Rental Yield Calculator
// ============================================

export class RentalYieldInputDto {
  @ApiProperty({ description: 'Property purchase price' })
  @IsNumber()
  @Min(0)
  purchasePrice: number;

  @ApiProperty({ description: 'Monthly rental income' })
  @IsNumber()
  @Min(0)
  monthlyRent: number;

  @ApiPropertyOptional({ description: 'Annual operating expenses' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  annualExpenses?: number;
}

export class RentalYieldResultDto {
  @ApiProperty({ description: 'Gross rental yield percentage' })
  grossYield: number;

  @ApiProperty({ description: 'Net rental yield percentage' })
  netYield: number;

  @ApiProperty({ description: 'Annual gross income' })
  annualGrossIncome: number;

  @ApiProperty({ description: 'Annual net income' })
  annualNetIncome: number;
}

// ============================================
// PROD-164: Depreciation Calculator
// ============================================

export class DepreciationInputDto {
  @ApiProperty({ description: 'Property purchase price' })
  @IsNumber()
  @Min(0)
  purchasePrice: number;

  @ApiPropertyOptional({ description: 'Land value (not depreciable)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  landValue?: number;

  @ApiProperty({ description: 'Property type', enum: FinancialPropertyType })
  @IsEnum(FinancialPropertyType)
  propertyType: FinancialPropertyType;

  @ApiPropertyOptional({ description: 'Depreciation start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Renovation/improvement costs' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  improvementCosts?: number;
}

export class DepreciationResultDto {
  @ApiProperty({ description: 'Depreciable basis' })
  depreciableBasis: number;

  @ApiProperty({ description: 'Depreciation years based on property type' })
  depreciationYears: number;

  @ApiProperty({ description: 'Annual depreciation amount' })
  annualDepreciation: number;

  @ApiProperty({ description: 'Monthly depreciation amount' })
  monthlyDepreciation: number;

  @ApiProperty({ description: 'Schedule for next 5 years' })
  schedule: {
    year: number;
    depreciation: number;
    accumulatedDepreciation: number;
    remainingBasis: number;
  }[];
}

// ============================================
// PROD-165: Portfolio Tracker
// ============================================

export class CreatePortfolioDto {
  @ApiProperty({ description: 'Portfolio name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Portfolio description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdatePortfolioDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class AddPropertyToPortfolioDto {
  @ApiProperty({ description: 'Property ID' })
  @IsUUID()
  propertyId: string;

  @ApiProperty({ description: 'Purchase price' })
  @IsNumber()
  @Min(0)
  purchasePrice: number;

  @ApiProperty({ description: 'Purchase date' })
  @IsDateString()
  purchaseDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  closingCosts?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  renovationCosts?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  downPayment?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  loanAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  interestRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  loanTermYears?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyRent?: number;

  @ApiPropertyOptional({ description: 'Property type for depreciation', enum: FinancialPropertyType })
  @IsOptional()
  @IsEnum(FinancialPropertyType)
  depreciationType?: FinancialPropertyType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  landValue?: number;
}

export class PortfolioPropertyResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  propertyId: string;

  @ApiProperty()
  propertyAddress: string;

  @ApiProperty()
  purchasePrice: number;

  @ApiProperty()
  purchaseDate: Date;

  @ApiPropertyOptional()
  currentValue?: number;

  @ApiPropertyOptional()
  equity?: number;

  @ApiPropertyOptional()
  monthlyRent?: number;

  @ApiPropertyOptional()
  monthlyCashFlow?: number;

  @ApiPropertyOptional()
  annualRoi?: number;

  @ApiPropertyOptional()
  capRate?: number;
}

export class PortfolioResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  propertyCount: number;

  @ApiPropertyOptional()
  totalValue?: number;

  @ApiPropertyOptional()
  totalEquity?: number;

  @ApiPropertyOptional()
  totalIncome?: number;

  @ApiPropertyOptional()
  totalExpenses?: number;

  @ApiPropertyOptional()
  cashFlow?: number;

  @ApiPropertyOptional()
  overallRoi?: number;

  @ApiPropertyOptional()
  cashOnCash?: number;

  @ApiProperty({ type: [PortfolioPropertyResponseDto] })
  properties: PortfolioPropertyResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

// ============================================
// PROD-166: Loan Comparison
// ============================================

export class LoanOptionDto {
  @ApiProperty()
  @IsString()
  lenderName: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  loanAmount: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(30)
  interestRate: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(40)
  loanTermYears: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  originationFee?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  closingCosts?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  points?: number;
}

export class LoanComparisonInputDto {
  @ApiProperty({ type: [LoanOptionDto], minItems: 2, maxItems: 5 })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LoanOptionDto)
  loans: LoanOptionDto[];
}

export class LoanComparisonResultDto {
  @ApiProperty()
  lenderName: string;

  @ApiProperty()
  monthlyPayment: number;

  @ApiProperty()
  totalInterest: number;

  @ApiProperty()
  totalCost: number;

  @ApiProperty()
  effectiveRate: number;

  @ApiProperty()
  rank: number;

  @ApiPropertyOptional()
  breakEvenMonths?: number;
}

// ============================================
// PROD-167: Down Payment Assistance
// ============================================

export class DownPaymentProgramQueryDto {
  @ApiPropertyOptional({ description: 'US State code' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Household income' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  income?: number;

  @ApiPropertyOptional({ description: 'Purchase price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  purchasePrice?: number;

  @ApiPropertyOptional({ description: 'Is first-time buyer' })
  @IsOptional()
  @IsBoolean()
  firstTimeBuyer?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(300)
  @Max(850)
  creditScore?: number;
}

export class DownPaymentProgramResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  programType: string;

  @ApiPropertyOptional()
  state?: string;

  @ApiPropertyOptional()
  maxAmount?: number;

  @ApiPropertyOptional()
  percentageOfPrice?: number;

  @ApiPropertyOptional()
  applicationUrl?: string;

  @ApiPropertyOptional()
  deadline?: Date;

  @ApiProperty()
  isEligible: boolean;
}

// ============================================
// PROD-168: Tax Reporting
// ============================================

export class GenerateTaxReportDto {
  @ApiProperty({ description: 'Tax year' })
  @IsInt()
  @Min(2000)
  @Max(2100)
  taxYear: number;

  @ApiPropertyOptional({ description: 'Portfolio ID to generate report for' })
  @IsOptional()
  @IsUUID()
  portfolioId?: string;
}

export class TaxReportResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  taxYear: number;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiProperty({ description: 'Income summary' })
  income: {
    rentalIncome: number;
    otherIncome: number;
    totalIncome: number;
  };

  @ApiProperty({ description: 'Expense summary' })
  expenses: {
    mortgageInterest: number;
    propertyTaxes: number;
    insurance: number;
    repairs: number;
    maintenance: number;
    utilities: number;
    management: number;
    professional: number;
    depreciation: number;
    otherExpenses: number;
    totalExpenses: number;
  };

  @ApiProperty()
  netIncome: number;

  @ApiPropertyOptional()
  propertyDetails?: {
    propertyId: string;
    address: string;
    income: number;
    expenses: number;
    depreciation: number;
    netIncome: number;
  }[];

  @ApiProperty()
  status: string;

  @ApiProperty()
  createdAt: Date;
}

// ============================================
// PROD-169: Cash Flow Projection
// ============================================

export class CashFlowProjectionInputDto {
  @ApiProperty({ description: 'Property ID' })
  @IsUUID()
  propertyId: string;

  @ApiPropertyOptional({ description: 'Number of months to project (default 12)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  projectionMonths?: number;

  @ApiPropertyOptional({ description: 'Vacancy rate percentage (default 5)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  vacancyRate?: number;

  @ApiPropertyOptional({ description: 'Annual rent growth rate percentage (default 2)' })
  @IsOptional()
  @IsNumber()
  @Min(-10)
  @Max(20)
  rentGrowthRate?: number;

  @ApiPropertyOptional({ description: 'Annual expense growth rate percentage (default 3)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  expenseGrowthRate?: number;

  @ApiProperty({ description: 'Current monthly rent' })
  @IsNumber()
  @Min(0)
  monthlyRent: number;

  @ApiProperty({ description: 'Current monthly expenses' })
  @IsNumber()
  @Min(0)
  monthlyExpenses: number;
}

export class MonthlyProjectionDto {
  @ApiProperty()
  month: number;

  @ApiProperty()
  monthName: string;

  @ApiProperty()
  income: number;

  @ApiProperty()
  expenses: number;

  @ApiProperty()
  netCashFlow: number;

  @ApiProperty()
  cumulativeCashFlow: number;
}

export class CashFlowProjectionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  propertyId: string;

  @ApiProperty()
  projectionMonths: number;

  @ApiProperty()
  vacancyRate: number;

  @ApiProperty()
  rentGrowthRate: number;

  @ApiProperty()
  expenseGrowthRate: number;

  @ApiProperty({ type: [MonthlyProjectionDto] })
  projections: MonthlyProjectionDto[];

  @ApiProperty()
  totalProjectedIncome: number;

  @ApiProperty()
  totalProjectedExpenses: number;

  @ApiProperty()
  totalProjectedCashFlow: number;

  @ApiProperty()
  averageMonthlyCashFlow: number;

  @ApiProperty()
  createdAt: Date;
}
