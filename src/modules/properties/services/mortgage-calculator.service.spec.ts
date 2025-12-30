import { Test, TestingModule } from '@nestjs/testing';
import { MortgageCalculatorService } from './mortgage-calculator.service';
import { PrismaService } from '@/database/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('MortgageCalculatorService', () => {
  let service: MortgageCalculatorService;
  let prismaService: PrismaService;

  const mockPropertyId = 'property-123';

  const mockProperty = {
    id: mockPropertyId,
    title: 'Test Property',
    basePrice: 500000, // $500,000 in decimal (stored as Decimal, converted to cents in service)
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MortgageCalculatorService,
        {
          provide: PrismaService,
          useValue: {
            property: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<MortgageCalculatorService>(MortgageCalculatorService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('calculateMortgage', () => {
    it('should calculate monthly payment correctly (PROD-083.2)', () => {
      const result = service.calculateMortgage({
        propertyPrice: 50000000, // $500,000
        downPayment: 10000000, // $100,000 (20%)
        interestRate: 6.5,
        termYears: 30,
      });

      expect(result.loanAmount).toBe(40000000); // $400,000
      expect(result.downPaymentPercent).toBe(20);
      // Expected monthly payment for $400k at 6.5% for 30 years is ~$2,528
      expect(result.monthlyPayment).toBeGreaterThan(252000);
      expect(result.monthlyPayment).toBeLessThan(254000);
      expect(result.totalPayment).toBe(result.monthlyPayment * 360);
      expect(result.totalInterest).toBe(result.totalPayment - result.loanAmount);
    });

    it('should handle different term lengths', () => {
      const result30 = service.calculateMortgage({
        propertyPrice: 50000000,
        downPayment: 10000000,
        interestRate: 6.5,
        termYears: 30,
      });

      const result15 = service.calculateMortgage({
        propertyPrice: 50000000,
        downPayment: 10000000,
        interestRate: 6.5,
        termYears: 15,
      });

      // 15-year should have higher monthly payment
      expect(result15.monthlyPayment).toBeGreaterThan(result30.monthlyPayment);
      // 15-year should have lower total interest
      expect(result15.totalInterest).toBeLessThan(result30.totalInterest);
    });

    it('should handle 0% interest rate', () => {
      const result = service.calculateMortgage({
        propertyPrice: 12000000, // $120,000
        downPayment: 0,
        interestRate: 0,
        termYears: 10,
      });

      // With 0% interest, monthly payment is just principal / months
      expect(result.monthlyPayment).toBe(100000); // $1,000/month
      expect(result.totalInterest).toBe(0);
      expect(result.totalPayment).toBe(result.loanAmount);
    });

    it('should calculate down payment percentage correctly', () => {
      const result = service.calculateMortgage({
        propertyPrice: 40000000,
        downPayment: 8000000, // 20%
        interestRate: 5,
        termYears: 30,
      });

      expect(result.downPaymentPercent).toBe(20);
    });

    it('should include propertyId when provided', () => {
      const result = service.calculateMortgage({
        propertyPrice: 50000000,
        downPayment: 10000000,
        interestRate: 6.5,
        termYears: 30,
        propertyId: mockPropertyId,
      });

      expect(result.propertyId).toBe(mockPropertyId);
    });

    it('should handle small down payments', () => {
      const result = service.calculateMortgage({
        propertyPrice: 50000000,
        downPayment: 1750000, // 3.5% (FHA minimum)
        interestRate: 6.5,
        termYears: 30,
      });

      expect(result.downPaymentPercent).toBe(3.5);
      expect(result.loanAmount).toBe(48250000);
    });
  });

  describe('calculateForProperty', () => {
    it('should fetch property price and calculate mortgage (PROD-083.3)', async () => {
      jest
        .spyOn(prismaService.property, 'findUnique')
        .mockResolvedValue(mockProperty as any);

      const result = await service.calculateForProperty(mockPropertyId, {
        downPayment: 10000000,
        interestRate: 6.5,
        termYears: 30,
      });

      expect(result.propertyPrice).toBe(50000000);
      expect(result.propertyId).toBe(mockPropertyId);
      expect(result.loanAmount).toBe(40000000);
    });

    it('should throw NotFoundException if property not found', async () => {
      jest.spyOn(prismaService.property, 'findUnique').mockResolvedValue(null);

      await expect(
        service.calculateForProperty(mockPropertyId, {
          downPayment: 10000000,
          interestRate: 6.5,
          termYears: 30,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if property has no price', async () => {
      jest.spyOn(prismaService.property, 'findUnique').mockResolvedValue({
        ...mockProperty,
        basePrice: null,
      } as any);

      await expect(
        service.calculateForProperty(mockPropertyId, {
          downPayment: 10000000,
          interestRate: 6.5,
          termYears: 30,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateAmortizationSchedule', () => {
    it('should generate correct number of payments (PROD-083.4)', () => {
      const result = service.generateAmortizationSchedule({
        propertyPrice: 50000000,
        downPayment: 10000000,
        interestRate: 6.5,
        termYears: 30,
      });

      expect(result.schedule).toHaveLength(360); // 30 years * 12 months
      expect(result.yearlySummary).toHaveLength(30);
    });

    it('should have first payment with correct structure', () => {
      const result = service.generateAmortizationSchedule({
        propertyPrice: 50000000,
        downPayment: 10000000,
        interestRate: 6.5,
        termYears: 30,
      });

      const firstPayment = result.schedule[0];
      expect(firstPayment.paymentNumber).toBe(1);
      expect(firstPayment.payment).toBe(result.monthlyPayment);
      expect(firstPayment.principal).toBeGreaterThan(0);
      expect(firstPayment.interest).toBeGreaterThan(0);
      expect(firstPayment.principal + firstPayment.interest).toBe(firstPayment.payment);
      expect(firstPayment.remainingBalance).toBeLessThan(result.loanAmount);
    });

    it('should have last payment reduce balance to zero', () => {
      const result = service.generateAmortizationSchedule({
        propertyPrice: 50000000,
        downPayment: 10000000,
        interestRate: 6.5,
        termYears: 30,
      });

      const lastPayment = result.schedule[result.schedule.length - 1];
      expect(lastPayment.paymentNumber).toBe(360);
      expect(lastPayment.remainingBalance).toBe(0);
      expect(lastPayment.cumulativePrincipal).toBe(result.loanAmount);
    });

    it('should have principal portion increase over time', () => {
      const result = service.generateAmortizationSchedule({
        propertyPrice: 50000000,
        downPayment: 10000000,
        interestRate: 6.5,
        termYears: 30,
      });

      const firstPayment = result.schedule[0];
      const lastPayment = result.schedule[result.schedule.length - 1];

      // Principal portion should increase as loan matures
      expect(lastPayment.principal).toBeGreaterThan(firstPayment.principal);
      // Interest portion should decrease as loan matures
      expect(lastPayment.interest).toBeLessThan(firstPayment.interest);
    });

    it('should calculate cumulative totals correctly', () => {
      const result = service.generateAmortizationSchedule({
        propertyPrice: 50000000,
        downPayment: 10000000,
        interestRate: 6.5,
        termYears: 30,
      });

      const lastPayment = result.schedule[result.schedule.length - 1];
      expect(lastPayment.cumulativePrincipal).toBe(result.loanAmount);
      // Allow for rounding differences in interest calculations
      expect(Math.abs(lastPayment.cumulativeInterest - result.totalInterest)).toBeLessThan(500);
    });

    it('should generate yearly summary', () => {
      const result = service.generateAmortizationSchedule({
        propertyPrice: 50000000,
        downPayment: 10000000,
        interestRate: 6.5,
        termYears: 30,
      });

      expect(result.yearlySummary).toHaveLength(30);
      expect(result.yearlySummary[0].year).toBe(1);
      expect(result.yearlySummary[29].year).toBe(30);
      expect(result.yearlySummary[29].endingBalance).toBe(0);
    });
  });

  describe('generateAmortizationForProperty', () => {
    it('should generate amortization schedule for property', async () => {
      jest
        .spyOn(prismaService.property, 'findUnique')
        .mockResolvedValue(mockProperty as any);

      const result = await service.generateAmortizationForProperty(mockPropertyId, {
        downPayment: 10000000,
        interestRate: 6.5,
        termYears: 30,
      });

      expect(result.propertyId).toBe(mockPropertyId);
      expect(result.schedule).toHaveLength(360);
    });

    it('should throw NotFoundException if property not found', async () => {
      jest.spyOn(prismaService.property, 'findUnique').mockResolvedValue(null);

      await expect(
        service.generateAmortizationForProperty(mockPropertyId, {
          downPayment: 10000000,
          interestRate: 6.5,
          termYears: 30,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('calculateAffordability', () => {
    it('should calculate maximum affordable home price', () => {
      const result = service.calculateAffordability({
        monthlyIncome: 1000000, // $10,000/month
        monthlyDebt: 50000, // $500/month
        downPayment: 10000000, // $100,000
        interestRate: 6.5,
        termYears: 30,
      });

      // With 43% DTI, max total debt = $4,300
      // Available for housing = $4,300 - $500 = $3,800
      expect(result.maxMonthlyPayment).toBeLessThanOrEqual(380000);
      expect(result.maxPropertyPrice).toBeGreaterThan(result.downPayment);
      expect(result.dtiRatio).toBe(0.43);
    });

    it('should use custom DTI ratio when provided', () => {
      const result = service.calculateAffordability({
        monthlyIncome: 1000000,
        monthlyDebt: 50000,
        downPayment: 10000000,
        interestRate: 6.5,
        termYears: 30,
        maxDtiRatio: 0.36,
      });

      expect(result.dtiRatio).toBe(0.36);
      // Lower DTI should result in lower max price
      const higherDtiResult = service.calculateAffordability({
        monthlyIncome: 1000000,
        monthlyDebt: 50000,
        downPayment: 10000000,
        interestRate: 6.5,
        termYears: 30,
        maxDtiRatio: 0.43,
      });

      expect(result.maxPropertyPrice).toBeLessThan(higherDtiResult.maxPropertyPrice);
    });

    it('should handle high existing debt', () => {
      const result = service.calculateAffordability({
        monthlyIncome: 500000, // $5,000/month
        monthlyDebt: 200000, // $2,000/month debt
        downPayment: 5000000,
        interestRate: 6.5,
        termYears: 30,
      });

      // Max debt at 43% = $2,150, minus $2,000 = $150 available
      expect(result.maxMonthlyPayment).toBeLessThanOrEqual(15000);
    });

    it('should return zero when debt exceeds DTI limit', () => {
      const result = service.calculateAffordability({
        monthlyIncome: 500000,
        monthlyDebt: 250000, // Exceeds 43% DTI
        downPayment: 5000000,
        interestRate: 6.5,
        termYears: 30,
      });

      expect(result.maxMonthlyPayment).toBe(0);
      expect(result.maxLoanAmount).toBe(0);
      expect(result.maxPropertyPrice).toBe(5000000); // Only down payment
    });
  });

  describe('compareMortgages', () => {
    it('should compare multiple mortgage scenarios', () => {
      const result = service.compareMortgages({
        propertyPrice: 50000000,
        downPayment: 10000000,
        scenarios: [
          { name: '30-Year Fixed', interestRate: 6.5, termYears: 30 },
          { name: '15-Year Fixed', interestRate: 5.75, termYears: 15 },
        ],
      });

      expect(result.comparisons).toHaveLength(2);
      expect(result.comparisons[0].name).toBe('30-Year Fixed');
      expect(result.comparisons[1].name).toBe('15-Year Fixed');
      expect(result.loanAmount).toBe(40000000);
    });

    it('should recommend lowest total cost option', () => {
      const result = service.compareMortgages({
        propertyPrice: 50000000,
        downPayment: 10000000,
        scenarios: [
          { name: '30-Year Fixed', interestRate: 6.5, termYears: 30 },
          { name: '15-Year Fixed', interestRate: 5.75, termYears: 15 },
          { name: '10-Year Fixed', interestRate: 5.5, termYears: 10 },
        ],
      });

      // Shorter term with lower rate should have lowest total payment
      expect(result.recommendation).toBe('10-Year Fixed');
    });

    it('should show 15-year has lower total interest than 30-year', () => {
      const result = service.compareMortgages({
        propertyPrice: 50000000,
        downPayment: 10000000,
        scenarios: [
          { name: '30-Year', interestRate: 6.5, termYears: 30 },
          { name: '15-Year', interestRate: 6.5, termYears: 15 },
        ],
      });

      const thirtyYear = result.comparisons.find((c) => c.name === '30-Year');
      const fifteenYear = result.comparisons.find((c) => c.name === '15-Year');

      expect(fifteenYear!.totalInterest).toBeLessThan(thirtyYear!.totalInterest);
    });
  });

  describe('getDefaultScenarios', () => {
    it('should return default scenarios with 20% down payment', async () => {
      jest
        .spyOn(prismaService.property, 'findUnique')
        .mockResolvedValue(mockProperty as any);

      const result = await service.getDefaultScenarios(mockPropertyId);

      expect(result.propertyPrice).toBe(50000000);
      expect(result.downPayment).toBe(10000000); // 20%
      expect(result.comparisons).toHaveLength(4);
      expect(result.comparisons.map((c) => c.name)).toContain('30-Year Fixed');
      expect(result.comparisons.map((c) => c.name)).toContain('15-Year Fixed');
    });

    it('should throw NotFoundException if property not found', async () => {
      jest.spyOn(prismaService.property, 'findUnique').mockResolvedValue(null);

      await expect(service.getDefaultScenarios(mockPropertyId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if property has no price', async () => {
      jest.spyOn(prismaService.property, 'findUnique').mockResolvedValue({
        ...mockProperty,
        basePrice: null,
      } as any);

      await expect(service.getDefaultScenarios(mockPropertyId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
