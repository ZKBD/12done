import { IsNumber, IsPositive, Min, Max, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for mortgage calculation request (PROD-083.1)
 */
export class MortgageCalculationDto {
  @ApiProperty({ description: 'Property price in cents', example: 50000000 })
  @IsNumber()
  @IsPositive()
  propertyPrice: number;

  @ApiProperty({ description: 'Down payment amount in cents', example: 10000000 })
  @IsNumber()
  @Min(0)
  downPayment: number;

  @ApiProperty({ description: 'Annual interest rate as percentage', example: 6.5 })
  @IsNumber()
  @IsPositive()
  @Max(100)
  interestRate: number;

  @ApiProperty({ description: 'Loan term in years', example: 30 })
  @IsNumber()
  @IsPositive()
  @Max(50)
  termYears: number;

  @ApiPropertyOptional({ description: 'Property ID for context', example: 'uuid' })
  @IsOptional()
  @IsUUID()
  propertyId?: string;
}

/**
 * DTO for property-specific mortgage calculation (PROD-083.3)
 */
export class PropertyMortgageCalculationDto {
  @ApiProperty({ description: 'Down payment amount in cents', example: 10000000 })
  @IsNumber()
  @Min(0)
  downPayment: number;

  @ApiProperty({ description: 'Annual interest rate as percentage', example: 6.5 })
  @IsNumber()
  @IsPositive()
  @Max(100)
  interestRate: number;

  @ApiProperty({ description: 'Loan term in years', example: 30 })
  @IsNumber()
  @IsPositive()
  @Max(50)
  termYears: number;
}

/**
 * Response DTO for basic mortgage calculation (PROD-083.2)
 */
export class MortgageCalculationResponseDto {
  @ApiProperty({ description: 'Property price in cents' })
  propertyPrice: number;

  @ApiProperty({ description: 'Down payment amount in cents' })
  downPayment: number;

  @ApiProperty({ description: 'Down payment as percentage of property price' })
  downPaymentPercent: number;

  @ApiProperty({ description: 'Loan amount (principal) in cents' })
  loanAmount: number;

  @ApiProperty({ description: 'Annual interest rate as percentage' })
  interestRate: number;

  @ApiProperty({ description: 'Loan term in years' })
  termYears: number;

  @ApiProperty({ description: 'Monthly payment in cents (principal + interest)' })
  monthlyPayment: number;

  @ApiProperty({ description: 'Total amount paid over loan term in cents' })
  totalPayment: number;

  @ApiProperty({ description: 'Total interest paid over loan term in cents' })
  totalInterest: number;

  @ApiPropertyOptional({ description: 'Property ID if calculation was for specific property' })
  propertyId?: string;
}

/**
 * Single payment entry in amortization schedule (PROD-083.4)
 */
export class AmortizationPaymentDto {
  @ApiProperty({ description: 'Payment number (1-based)' })
  paymentNumber: number;

  @ApiProperty({ description: 'Month name and year', example: 'January 2025' })
  paymentDate: string;

  @ApiProperty({ description: 'Total monthly payment in cents' })
  payment: number;

  @ApiProperty({ description: 'Principal portion in cents' })
  principal: number;

  @ApiProperty({ description: 'Interest portion in cents' })
  interest: number;

  @ApiProperty({ description: 'Remaining balance after payment in cents' })
  remainingBalance: number;

  @ApiProperty({ description: 'Cumulative principal paid in cents' })
  cumulativePrincipal: number;

  @ApiProperty({ description: 'Cumulative interest paid in cents' })
  cumulativeInterest: number;
}

/**
 * Yearly summary for amortization schedule
 */
export class AmortizationYearlySummaryDto {
  @ApiProperty({ description: 'Year number (1-based)' })
  year: number;

  @ApiProperty({ description: 'Total principal paid this year in cents' })
  principalPaid: number;

  @ApiProperty({ description: 'Total interest paid this year in cents' })
  interestPaid: number;

  @ApiProperty({ description: 'Remaining balance at end of year in cents' })
  endingBalance: number;
}

/**
 * Full amortization schedule response (PROD-083.4)
 */
export class AmortizationScheduleResponseDto extends MortgageCalculationResponseDto {
  @ApiProperty({ description: 'Monthly payment schedule', type: [AmortizationPaymentDto] })
  schedule: AmortizationPaymentDto[];

  @ApiProperty({ description: 'Yearly summary', type: [AmortizationYearlySummaryDto] })
  yearlySummary: AmortizationYearlySummaryDto[];
}

/**
 * Affordability calculation request
 */
export class AffordabilityCalculationDto {
  @ApiProperty({ description: 'Monthly income in cents', example: 1000000 })
  @IsNumber()
  @IsPositive()
  monthlyIncome: number;

  @ApiProperty({ description: 'Monthly debt payments in cents', example: 50000 })
  @IsNumber()
  @Min(0)
  monthlyDebt: number;

  @ApiProperty({ description: 'Available down payment in cents', example: 10000000 })
  @IsNumber()
  @Min(0)
  downPayment: number;

  @ApiProperty({ description: 'Annual interest rate as percentage', example: 6.5 })
  @IsNumber()
  @IsPositive()
  @Max(100)
  interestRate: number;

  @ApiProperty({ description: 'Loan term in years', example: 30 })
  @IsNumber()
  @IsPositive()
  @Max(50)
  termYears: number;

  @ApiPropertyOptional({ description: 'Max debt-to-income ratio', example: 0.43, default: 0.43 })
  @IsOptional()
  @IsNumber()
  @Max(1)
  maxDtiRatio?: number;
}

/**
 * Affordability calculation response
 */
export class AffordabilityResponseDto {
  @ApiProperty({ description: 'Maximum affordable property price in cents' })
  maxPropertyPrice: number;

  @ApiProperty({ description: 'Maximum monthly payment in cents' })
  maxMonthlyPayment: number;

  @ApiProperty({ description: 'Maximum loan amount in cents' })
  maxLoanAmount: number;

  @ApiProperty({ description: 'Down payment amount in cents' })
  downPayment: number;

  @ApiProperty({ description: 'Debt-to-income ratio used' })
  dtiRatio: number;

  @ApiProperty({ description: 'Monthly income in cents' })
  monthlyIncome: number;

  @ApiProperty({ description: 'Current monthly debt in cents' })
  monthlyDebt: number;

  @ApiProperty({ description: 'Available monthly for housing in cents' })
  availableForHousing: number;
}

/**
 * Compare multiple mortgage scenarios
 */
export class MortgageComparisonItemDto {
  @ApiProperty({ description: 'Scenario name', example: '30-year fixed' })
  name: string;

  @ApiProperty({ description: 'Annual interest rate as percentage' })
  interestRate: number;

  @ApiProperty({ description: 'Loan term in years' })
  termYears: number;
}

export class MortgageComparisonRequestDto {
  @ApiProperty({ description: 'Property price in cents' })
  @IsNumber()
  @IsPositive()
  propertyPrice: number;

  @ApiProperty({ description: 'Down payment amount in cents' })
  @IsNumber()
  @Min(0)
  downPayment: number;

  @ApiProperty({ description: 'Scenarios to compare', type: [MortgageComparisonItemDto] })
  scenarios: MortgageComparisonItemDto[];
}

export class MortgageComparisonResultDto extends MortgageCalculationResponseDto {
  @ApiProperty({ description: 'Scenario name' })
  name: string;
}

export class MortgageComparisonResponseDto {
  @ApiProperty({ description: 'Property price in cents' })
  propertyPrice: number;

  @ApiProperty({ description: 'Down payment in cents' })
  downPayment: number;

  @ApiProperty({ description: 'Loan amount in cents' })
  loanAmount: number;

  @ApiProperty({ description: 'Comparison results', type: [MortgageComparisonResultDto] })
  comparisons: MortgageComparisonResultDto[];

  @ApiProperty({ description: 'Recommended scenario based on lowest total cost' })
  recommendation: string;
}
