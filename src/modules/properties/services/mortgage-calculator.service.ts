import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import {
  MortgageCalculationDto,
  MortgageCalculationResponseDto,
  PropertyMortgageCalculationDto,
  AmortizationScheduleResponseDto,
  AmortizationPaymentDto,
  AmortizationYearlySummaryDto,
  AffordabilityCalculationDto,
  AffordabilityResponseDto,
  MortgageComparisonRequestDto,
  MortgageComparisonResponseDto,
  MortgageComparisonResultDto,
} from '../dto/mortgage-calculator.dto';

@Injectable()
export class MortgageCalculatorService {
  private readonly logger = new Logger(MortgageCalculatorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate monthly mortgage payment (PROD-083.2)
   * Uses standard amortization formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
   * Where:
   *   M = monthly payment
   *   P = principal (loan amount)
   *   r = monthly interest rate (annual rate / 12)
   *   n = total number of payments (years * 12)
   */
  calculateMortgage(dto: MortgageCalculationDto): MortgageCalculationResponseDto {
    const { propertyPrice, downPayment, interestRate, termYears, propertyId } = dto;

    // Calculate loan amount (principal)
    const loanAmount = propertyPrice - downPayment;

    // Convert annual rate to monthly rate (as decimal)
    const monthlyRate = interestRate / 100 / 12;

    // Total number of payments
    const totalPayments = termYears * 12;

    // Calculate monthly payment using amortization formula
    let monthlyPayment: number;
    if (monthlyRate === 0) {
      // Handle 0% interest rate edge case
      monthlyPayment = Math.round(loanAmount / totalPayments);
    } else {
      const factor = Math.pow(1 + monthlyRate, totalPayments);
      monthlyPayment = Math.round(loanAmount * (monthlyRate * factor) / (factor - 1));
    }

    // Calculate totals
    const totalPayment = monthlyPayment * totalPayments;
    const totalInterest = totalPayment - loanAmount;

    // Calculate down payment percentage
    const downPaymentPercent = propertyPrice > 0
      ? Math.round((downPayment / propertyPrice) * 10000) / 100
      : 0;

    this.logger.log(
      `Calculated mortgage: price=${propertyPrice}, loan=${loanAmount}, rate=${interestRate}%, term=${termYears}yr, monthly=${monthlyPayment}`,
    );

    return {
      propertyPrice,
      downPayment,
      downPaymentPercent,
      loanAmount,
      interestRate,
      termYears,
      monthlyPayment,
      totalPayment,
      totalInterest,
      propertyId,
    };
  }

  /**
   * Calculate mortgage for a specific property (PROD-083.3)
   * Fetches property price and calculates mortgage
   */
  async calculateForProperty(
    propertyId: string,
    dto: PropertyMortgageCalculationDto,
  ): Promise<MortgageCalculationResponseDto> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, basePrice: true, title: true },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (!property.basePrice) {
      throw new NotFoundException('Property does not have a price set');
    }

    // Convert Decimal to number (basePrice is stored as Decimal, convert to cents)
    const priceInCents = Math.round(Number(property.basePrice) * 100);

    return this.calculateMortgage({
      propertyPrice: priceInCents,
      downPayment: dto.downPayment,
      interestRate: dto.interestRate,
      termYears: dto.termYears,
      propertyId,
    });
  }

  /**
   * Generate full amortization schedule (PROD-083.4)
   * Returns monthly payment breakdown showing principal vs interest
   */
  generateAmortizationSchedule(dto: MortgageCalculationDto): AmortizationScheduleResponseDto {
    const basicCalc = this.calculateMortgage(dto);
    const { loanAmount, interestRate, termYears, monthlyPayment } = basicCalc;

    const monthlyRate = interestRate / 100 / 12;
    const totalPayments = termYears * 12;

    const schedule: AmortizationPaymentDto[] = [];
    const yearlySummary: AmortizationYearlySummaryDto[] = [];

    let remainingBalance = loanAmount;
    let cumulativePrincipal = 0;
    let cumulativeInterest = 0;

    // Yearly tracking
    let yearlyPrincipal = 0;
    let yearlyInterest = 0;
    let currentYear = 1;

    const startDate = new Date();
    startDate.setDate(1); // Start from first of next month
    startDate.setMonth(startDate.getMonth() + 1);

    for (let i = 1; i <= totalPayments; i++) {
      // Calculate interest for this payment
      const interestPayment = Math.round(remainingBalance * monthlyRate);

      // Calculate principal for this payment
      let principalPayment = monthlyPayment - interestPayment;

      // Handle final payment rounding
      if (i === totalPayments) {
        principalPayment = remainingBalance;
      }

      // Update balances
      remainingBalance = Math.max(0, remainingBalance - principalPayment);
      cumulativePrincipal += principalPayment;
      cumulativeInterest += interestPayment;
      yearlyPrincipal += principalPayment;
      yearlyInterest += interestPayment;

      // Calculate payment date
      const paymentDate = new Date(startDate);
      paymentDate.setMonth(paymentDate.getMonth() + i - 1);
      const monthName = paymentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

      schedule.push({
        paymentNumber: i,
        paymentDate: monthName,
        payment: monthlyPayment,
        principal: principalPayment,
        interest: interestPayment,
        remainingBalance,
        cumulativePrincipal,
        cumulativeInterest,
      });

      // Create yearly summary at end of each year
      if (i % 12 === 0 || i === totalPayments) {
        yearlySummary.push({
          year: currentYear,
          principalPaid: yearlyPrincipal,
          interestPaid: yearlyInterest,
          endingBalance: remainingBalance,
        });
        currentYear++;
        yearlyPrincipal = 0;
        yearlyInterest = 0;
      }
    }

    this.logger.log(
      `Generated amortization schedule: ${schedule.length} payments, ${yearlySummary.length} years`,
    );

    return {
      ...basicCalc,
      schedule,
      yearlySummary,
    };
  }

  /**
   * Generate amortization schedule for a specific property
   */
  async generateAmortizationForProperty(
    propertyId: string,
    dto: PropertyMortgageCalculationDto,
  ): Promise<AmortizationScheduleResponseDto> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, basePrice: true },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (!property.basePrice) {
      throw new NotFoundException('Property does not have a price set');
    }

    // Convert Decimal to number (basePrice is stored as Decimal, convert to cents)
    const priceInCents = Math.round(Number(property.basePrice) * 100);

    return this.generateAmortizationSchedule({
      propertyPrice: priceInCents,
      downPayment: dto.downPayment,
      interestRate: dto.interestRate,
      termYears: dto.termYears,
      propertyId,
    });
  }

  /**
   * Calculate maximum affordable home price based on income
   */
  calculateAffordability(dto: AffordabilityCalculationDto): AffordabilityResponseDto {
    const {
      monthlyIncome,
      monthlyDebt,
      downPayment,
      interestRate,
      termYears,
      maxDtiRatio = 0.43, // Standard DTI ratio
    } = dto;

    // Calculate maximum monthly housing payment
    const maxTotalDebt = monthlyIncome * maxDtiRatio;
    const maxMonthlyPayment = Math.max(0, maxTotalDebt - monthlyDebt);

    // Convert to loan amount using reverse amortization formula
    const monthlyRate = interestRate / 100 / 12;
    const totalPayments = termYears * 12;

    let maxLoanAmount: number;
    if (monthlyRate === 0) {
      maxLoanAmount = maxMonthlyPayment * totalPayments;
    } else {
      const factor = Math.pow(1 + monthlyRate, totalPayments);
      maxLoanAmount = Math.round(maxMonthlyPayment * (factor - 1) / (monthlyRate * factor));
    }

    // Calculate max property price (loan + down payment)
    const maxPropertyPrice = maxLoanAmount + downPayment;

    this.logger.log(
      `Calculated affordability: income=${monthlyIncome}, maxPayment=${maxMonthlyPayment}, maxPrice=${maxPropertyPrice}`,
    );

    return {
      maxPropertyPrice,
      maxMonthlyPayment,
      maxLoanAmount,
      downPayment,
      dtiRatio: maxDtiRatio,
      monthlyIncome,
      monthlyDebt,
      availableForHousing: maxMonthlyPayment,
    };
  }

  /**
   * Compare multiple mortgage scenarios
   */
  compareMortgages(dto: MortgageComparisonRequestDto): MortgageComparisonResponseDto {
    const { propertyPrice, downPayment, scenarios } = dto;
    const loanAmount = propertyPrice - downPayment;

    const comparisons: MortgageComparisonResultDto[] = scenarios.map((scenario) => {
      const calc = this.calculateMortgage({
        propertyPrice,
        downPayment,
        interestRate: scenario.interestRate,
        termYears: scenario.termYears,
      });

      return {
        ...calc,
        name: scenario.name,
      };
    });

    // Find recommendation (lowest total cost)
    const lowestCost = comparisons.reduce((min, curr) =>
      curr.totalPayment < min.totalPayment ? curr : min,
    );

    this.logger.log(
      `Compared ${scenarios.length} mortgage scenarios, recommended: ${lowestCost.name}`,
    );

    return {
      propertyPrice,
      downPayment,
      loanAmount,
      comparisons,
      recommendation: lowestCost.name,
    };
  }

  /**
   * Get default mortgage scenarios for a property
   */
  async getDefaultScenarios(propertyId: string): Promise<MortgageComparisonResponseDto> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, basePrice: true },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (!property.basePrice) {
      throw new NotFoundException('Property does not have a price set');
    }

    // Convert Decimal to number (basePrice is stored as Decimal, convert to cents)
    const priceInCents = Math.round(Number(property.basePrice) * 100);

    // Default 20% down payment
    const downPayment = Math.round(priceInCents * 0.2);

    return this.compareMortgages({
      propertyPrice: priceInCents,
      downPayment,
      scenarios: [
        { name: '30-Year Fixed', interestRate: 6.5, termYears: 30 },
        { name: '15-Year Fixed', interestRate: 5.75, termYears: 15 },
        { name: '20-Year Fixed', interestRate: 6.25, termYears: 20 },
        { name: '10-Year Fixed', interestRate: 5.5, termYears: 10 },
      ],
    });
  }
}
