import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { FinancialToolsService } from './financial-tools.service';
import { PrismaService } from '@/database/prisma.service';
import { FinancialPropertyType, MarketTrend, Prisma } from '@prisma/client';

describe('FinancialToolsService', () => {
  let service: FinancialToolsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    property: {
      findUnique: jest.fn(),
    },
    propertyValuation: {
      create: jest.fn(),
    },
    priceHistory: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    investmentPortfolio: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    portfolioProperty: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    downPaymentProgram: {
      findMany: jest.fn(),
    },
    taxReport: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    expense: {
      findMany: jest.fn(),
    },
    lease: {
      findMany: jest.fn(),
    },
    cashFlowProjection: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockProperty = {
    id: 'property-1',
    ownerId: 'user-1',
    address: '123 Test St',
    city: 'Test City',
    country: 'US',
    basePrice: new Prisma.Decimal(300000),
    squareMeters: 150,
    bedrooms: 3,
    bathrooms: 2,
    yearBuilt: 2010,
    valuations: [],
    createdAt: new Date(),
    publishedAt: new Date(),
  };

  const mockPortfolio = {
    id: 'portfolio-1',
    userId: 'user-1',
    name: 'My Portfolio',
    description: 'Test portfolio',
    totalValue: new Prisma.Decimal(500000),
    totalEquity: new Prisma.Decimal(200000),
    totalIncome: new Prisma.Decimal(36000),
    totalExpenses: new Prisma.Decimal(24000),
    cashFlow: new Prisma.Decimal(12000),
    overallRoi: 6,
    cashOnCash: 6,
    properties: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancialToolsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<FinancialToolsService>(FinancialToolsService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('PROD-160: Property Valuation', () => {
    describe('getPropertyValuation', () => {
      it('should generate new valuation for property', async () => {
        mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
        mockPrismaService.propertyValuation.create.mockResolvedValue({
          id: 'valuation-1',
          propertyId: mockProperty.id,
          estimatedValue: new Prisma.Decimal(305000),
          confidenceLow: new Prisma.Decimal(290000),
          confidenceHigh: new Prisma.Decimal(320000),
          confidenceLevel: 75,
          comparableSales: [],
          marketData: { trend: 'STABLE', avgPricePerSqm: 2000, inventory: 25 },
          valuationMethod: 'COMPARABLE',
          createdAt: new Date(),
        });

        const result = await service.getPropertyValuation({
          propertyId: mockProperty.id,
        });

        expect(result).toBeDefined();
        expect(result.propertyId).toBe(mockProperty.id);
        expect(result.estimatedValue).toBeGreaterThan(0);
        expect(result.confidenceLevel).toBeGreaterThanOrEqual(0);
        expect(result.confidenceLevel).toBeLessThanOrEqual(100);
      });

      it('should throw NotFoundException for non-existent property', async () => {
        mockPrismaService.property.findUnique.mockResolvedValue(null);

        await expect(
          service.getPropertyValuation({ propertyId: 'non-existent' }),
        ).rejects.toThrow(NotFoundException);
      });

      it('should return cached valuation if recent', async () => {
        const recentValuation = {
          id: 'valuation-recent',
          propertyId: mockProperty.id,
          estimatedValue: new Prisma.Decimal(300000),
          confidenceLow: new Prisma.Decimal(285000),
          confidenceHigh: new Prisma.Decimal(315000),
          confidenceLevel: 80,
          comparableSales: [],
          marketData: {},
          valuationMethod: 'COMPARABLE',
          createdAt: new Date(), // Recent
        };

        mockPrismaService.property.findUnique.mockResolvedValue({
          ...mockProperty,
          valuations: [recentValuation],
        });

        const result = await service.getPropertyValuation({
          propertyId: mockProperty.id,
        });

        expect(result.id).toBe('valuation-recent');
        expect(mockPrismaService.propertyValuation.create).not.toHaveBeenCalled();
      });

      it('should use specified valuation method', async () => {
        mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
        mockPrismaService.propertyValuation.create.mockResolvedValue({
          id: 'valuation-income',
          propertyId: mockProperty.id,
          estimatedValue: new Prisma.Decimal(310000),
          confidenceLow: new Prisma.Decimal(295000),
          confidenceHigh: new Prisma.Decimal(325000),
          confidenceLevel: 70,
          valuationMethod: 'INCOME',
          createdAt: new Date(),
        });

        const result = await service.getPropertyValuation({
          propertyId: mockProperty.id,
          method: 'INCOME',
        });

        expect(result.valuationMethod).toBe('INCOME');
      });
    });
  });

  describe('PROD-161: Price Analytics', () => {
    describe('getPriceHistory', () => {
      it('should return price history for property', async () => {
        mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
        mockPrismaService.priceHistory.findMany.mockResolvedValue([
          {
            price: new Prisma.Decimal(290000),
            pricePerSqm: new Prisma.Decimal(1933),
            eventType: 'LISTED',
            eventDate: new Date('2024-01-01'),
            daysOnMarket: 0,
            marketTrend: MarketTrend.STABLE,
          },
          {
            price: new Prisma.Decimal(300000),
            pricePerSqm: new Prisma.Decimal(2000),
            eventType: 'INCREASED',
            eventDate: new Date('2024-06-01'),
            daysOnMarket: 150,
            marketTrend: MarketTrend.UP,
          },
        ]);

        const result = await service.getPriceHistory({
          propertyId: mockProperty.id,
        });

        expect(result.propertyId).toBe(mockProperty.id);
        expect(result.history).toHaveLength(2);
        expect(result.priceChangePercent).toBeDefined();
      });

      it('should create initial history entry if none exists', async () => {
        mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
        mockPrismaService.priceHistory.findMany.mockResolvedValue([]);
        mockPrismaService.priceHistory.create.mockResolvedValue({
          price: mockProperty.basePrice,
          pricePerSqm: new Prisma.Decimal(2000),
          eventType: 'LISTED',
          eventDate: mockProperty.publishedAt,
          daysOnMarket: 0,
          marketTrend: MarketTrend.STABLE,
        });

        const result = await service.getPriceHistory({
          propertyId: mockProperty.id,
        });

        expect(result.history).toHaveLength(1);
        expect(result.history[0].eventType).toBe('LISTED');
      });

      it('should throw NotFoundException for non-existent property', async () => {
        mockPrismaService.property.findUnique.mockResolvedValue(null);

        await expect(
          service.getPriceHistory({ propertyId: 'non-existent' }),
        ).rejects.toThrow(NotFoundException);
      });

      it('should filter by date range', async () => {
        mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
        mockPrismaService.priceHistory.findMany.mockResolvedValue([
          {
            price: new Prisma.Decimal(295000),
            eventType: 'LISTED',
            eventDate: new Date('2024-03-01'),
          },
        ]);

        const result = await service.getPriceHistory({
          propertyId: mockProperty.id,
          startDate: '2024-01-01',
          endDate: '2024-06-01',
        });

        expect(result.history).toBeDefined();
      });
    });
  });

  describe('PROD-162: ROI Calculator', () => {
    describe('calculateRoi', () => {
      it('should calculate ROI metrics correctly', () => {
        const input = {
          purchasePrice: 300000,
          downPayment: 60000,
          closingCosts: 9000,
          renovationCosts: 10000,
          monthlyRent: 2500,
          annualPropertyTax: 3600,
          annualInsurance: 1500,
          monthlyHoa: 200,
          annualMaintenance: 3000,
          vacancyRate: 5,
          managementFeeRate: 10,
          interestRate: 7,
          loanTermYears: 30,
        };

        const result = service.calculateRoi(input);

        expect(result.totalInvestment).toBe(79000); // 60000 + 9000 + 10000
        expect(result.loanAmount).toBe(240000); // 300000 - 60000
        expect(result.monthlyMortgage).toBeGreaterThan(0);
        expect(result.annualGrossIncome).toBeGreaterThan(0);
        expect(result.netOperatingIncome).toBeDefined();
        expect(result.capRate).toBeDefined();
        expect(result.cashOnCashReturn).toBeDefined();
        expect(result.roi).toBeDefined();
        expect(result.grossRentMultiplier).toBeDefined();
      });

      it('should handle zero down payment', () => {
        const result = service.calculateRoi({
          purchasePrice: 200000,
          monthlyRent: 1500,
        });

        expect(result.loanAmount).toBe(160000); // 200000 - default 20% down
        expect(result.monthlyMortgage).toBeGreaterThan(0);
      });

      it('should apply vacancy rate to income', () => {
        const withoutVacancy = service.calculateRoi({
          purchasePrice: 200000,
          monthlyRent: 2000,
          vacancyRate: 0,
        });

        const withVacancy = service.calculateRoi({
          purchasePrice: 200000,
          monthlyRent: 2000,
          vacancyRate: 10,
        });

        expect(withVacancy.annualGrossIncome).toBeLessThan(withoutVacancy.annualGrossIncome);
      });
    });
  });

  describe('PROD-162: Mortgage Calculator', () => {
    describe('calculateMortgage', () => {
      it('should calculate mortgage payment correctly', () => {
        const result = service.calculateMortgage({
          principal: 240000,
          interestRate: 7,
          loanTermYears: 30,
        });

        expect(result.monthlyPrincipalInterest).toBeGreaterThan(0);
        expect(result.totalInterest).toBeGreaterThan(0);
        expect(result.totalCost).toBeGreaterThan(240000);
        expect(result.amortizationSummary).toBeDefined();
        expect(result.amortizationSummary.length).toBeLessThanOrEqual(30);
      });

      it('should include PMI when specified', () => {
        const result = service.calculateMortgage({
          principal: 240000,
          interestRate: 7,
          loanTermYears: 30,
          includePmi: true,
        });

        expect(result.monthlyPmi).toBeGreaterThan(0);
        expect(result.totalMonthlyPayment).toBeGreaterThan(result.monthlyPrincipalInterest);
      });

      it('should include escrow amounts', () => {
        const result = service.calculateMortgage({
          principal: 240000,
          interestRate: 7,
          loanTermYears: 30,
          annualPropertyTax: 3600,
          annualInsurance: 1200,
        });

        expect(result.monthlyPropertyTax).toBe(300);
        expect(result.monthlyInsurance).toBe(100);
      });

      it('should handle zero interest rate', () => {
        const result = service.calculateMortgage({
          principal: 120000,
          interestRate: 0,
          loanTermYears: 10,
        });

        expect(result.monthlyPrincipalInterest).toBe(1000); // 120000 / 120 months
        expect(result.totalInterest).toBe(0);
      });

      it('should generate amortization summary by year', () => {
        const result = service.calculateMortgage({
          principal: 240000,
          interestRate: 7,
          loanTermYears: 30,
        });

        expect(result.amortizationSummary[0].year).toBe(1);
        expect(result.amortizationSummary[0].principalPaid).toBeGreaterThan(0);
        expect(result.amortizationSummary[0].interestPaid).toBeGreaterThan(0);
        expect(result.amortizationSummary[0].remainingBalance).toBeLessThan(240000);
      });
    });
  });

  describe('PROD-163: Rental Yield Calculator', () => {
    describe('calculateRentalYield', () => {
      it('should calculate gross and net yield', () => {
        const result = service.calculateRentalYield({
          purchasePrice: 300000,
          monthlyRent: 2500,
          annualExpenses: 6000,
        });

        expect(result.grossYield).toBe(10); // (2500 * 12) / 300000 * 100
        expect(result.netYield).toBe(8); // ((2500 * 12) - 6000) / 300000 * 100
        expect(result.annualGrossIncome).toBe(30000);
        expect(result.annualNetIncome).toBe(24000);
      });

      it('should throw error for zero purchase price', () => {
        expect(() =>
          service.calculateRentalYield({
            purchasePrice: 0,
            monthlyRent: 2500,
          }),
        ).toThrow(BadRequestException);
      });

      it('should handle zero expenses', () => {
        const result = service.calculateRentalYield({
          purchasePrice: 200000,
          monthlyRent: 1500,
        });

        expect(result.grossYield).toBe(result.netYield);
      });
    });
  });

  describe('PROD-164: Depreciation Calculator', () => {
    describe('calculateDepreciation', () => {
      it('should calculate residential depreciation (27.5 years)', () => {
        const result = service.calculateDepreciation({
          purchasePrice: 300000,
          landValue: 60000,
          propertyType: FinancialPropertyType.RESIDENTIAL_SINGLE,
        });

        expect(result.depreciableBasis).toBe(240000);
        expect(result.depreciationYears).toBe(27);
        expect(result.annualDepreciation).toBeCloseTo(8888.89, 1);
        expect(result.schedule).toHaveLength(5);
      });

      it('should calculate commercial depreciation (39 years)', () => {
        const result = service.calculateDepreciation({
          purchasePrice: 500000,
          landValue: 100000,
          propertyType: FinancialPropertyType.COMMERCIAL,
        });

        expect(result.depreciationYears).toBe(39);
        expect(result.annualDepreciation).toBeCloseTo(10256.41, 1);
      });

      it('should include improvement costs in basis', () => {
        const result = service.calculateDepreciation({
          purchasePrice: 300000,
          landValue: 60000,
          propertyType: FinancialPropertyType.RESIDENTIAL_SINGLE,
          improvementCosts: 50000,
        });

        expect(result.depreciableBasis).toBe(290000);
      });

      it('should use default land value of 20%', () => {
        const result = service.calculateDepreciation({
          purchasePrice: 300000,
          propertyType: FinancialPropertyType.RESIDENTIAL_SINGLE,
        });

        expect(result.depreciableBasis).toBe(240000); // 300000 - 60000 (20%)
      });
    });
  });

  describe('PROD-165: Portfolio Tracker', () => {
    describe('createPortfolio', () => {
      it('should create new portfolio', async () => {
        mockPrismaService.investmentPortfolio.create.mockResolvedValue({
          ...mockPortfolio,
          properties: [],
        });

        const result = await service.createPortfolio('user-1', {
          name: 'My Portfolio',
          description: 'Test portfolio',
        });

        expect(result.name).toBe('My Portfolio');
        expect(result.propertyCount).toBe(0);
      });
    });

    describe('getPortfolios', () => {
      it('should return user portfolios', async () => {
        mockPrismaService.investmentPortfolio.findMany.mockResolvedValue([
          mockPortfolio,
        ]);

        const result = await service.getPortfolios('user-1');

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('My Portfolio');
      });
    });

    describe('getPortfolioById', () => {
      it('should return portfolio with metrics', async () => {
        mockPrismaService.investmentPortfolio.findFirst.mockResolvedValue(mockPortfolio);
        mockPrismaService.investmentPortfolio.findUnique.mockResolvedValue(mockPortfolio);
        mockPrismaService.portfolioProperty.findMany.mockResolvedValue([]);

        const result = await service.getPortfolioById('portfolio-1', 'user-1');

        expect(result.id).toBe('portfolio-1');
        expect(result.totalValue).toBe(500000);
      });

      it('should throw NotFoundException for non-existent portfolio', async () => {
        mockPrismaService.investmentPortfolio.findFirst.mockResolvedValue(null);

        await expect(
          service.getPortfolioById('non-existent', 'user-1'),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('deletePortfolio', () => {
      it('should delete portfolio', async () => {
        mockPrismaService.investmentPortfolio.findFirst.mockResolvedValue(mockPortfolio);
        mockPrismaService.investmentPortfolio.delete.mockResolvedValue(mockPortfolio);

        await expect(
          service.deletePortfolio('portfolio-1', 'user-1'),
        ).resolves.not.toThrow();
      });

      it('should throw NotFoundException for non-existent portfolio', async () => {
        mockPrismaService.investmentPortfolio.findFirst.mockResolvedValue(null);

        await expect(
          service.deletePortfolio('non-existent', 'user-1'),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('addPropertyToPortfolio', () => {
      it('should add property to portfolio', async () => {
        mockPrismaService.investmentPortfolio.findFirst.mockResolvedValue(mockPortfolio);
        mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
        mockPrismaService.portfolioProperty.findUnique.mockResolvedValue(null);
        mockPrismaService.portfolioProperty.create.mockResolvedValue({
          id: 'pp-1',
          portfolioId: 'portfolio-1',
          propertyId: 'property-1',
          purchasePrice: new Prisma.Decimal(300000),
          purchaseDate: new Date(),
        });
        mockPrismaService.portfolioProperty.findMany.mockResolvedValue([]);
        mockPrismaService.investmentPortfolio.update.mockResolvedValue(mockPortfolio);
        mockPrismaService.investmentPortfolio.findUnique.mockResolvedValue(mockPortfolio);

        const result = await service.addPropertyToPortfolio('portfolio-1', 'user-1', {
          propertyId: 'property-1',
          purchasePrice: 300000,
          purchaseDate: '2024-01-01',
        });

        expect(result).toBeDefined();
      });

      it('should throw NotFoundException for non-existent property', async () => {
        mockPrismaService.investmentPortfolio.findFirst.mockResolvedValue(mockPortfolio);
        mockPrismaService.property.findUnique.mockResolvedValue(null);

        await expect(
          service.addPropertyToPortfolio('portfolio-1', 'user-1', {
            propertyId: 'non-existent',
            purchasePrice: 300000,
            purchaseDate: '2024-01-01',
          }),
        ).rejects.toThrow(NotFoundException);
      });

      it('should throw BadRequestException if property already in portfolio', async () => {
        mockPrismaService.investmentPortfolio.findFirst.mockResolvedValue(mockPortfolio);
        mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
        mockPrismaService.portfolioProperty.findUnique.mockResolvedValue({
          id: 'existing',
        });

        await expect(
          service.addPropertyToPortfolio('portfolio-1', 'user-1', {
            propertyId: 'property-1',
            purchasePrice: 300000,
            purchaseDate: '2024-01-01',
          }),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('removePropertyFromPortfolio', () => {
      it('should remove property from portfolio', async () => {
        mockPrismaService.investmentPortfolio.findFirst.mockResolvedValue(mockPortfolio);
        mockPrismaService.portfolioProperty.findUnique.mockResolvedValue({ id: 'pp-1' });
        mockPrismaService.portfolioProperty.delete.mockResolvedValue({});
        mockPrismaService.portfolioProperty.findMany.mockResolvedValue([]);
        mockPrismaService.investmentPortfolio.update.mockResolvedValue(mockPortfolio);

        await expect(
          service.removePropertyFromPortfolio('portfolio-1', 'property-1', 'user-1'),
        ).resolves.not.toThrow();
      });

      it('should throw NotFoundException if property not in portfolio', async () => {
        mockPrismaService.investmentPortfolio.findFirst.mockResolvedValue(mockPortfolio);
        mockPrismaService.portfolioProperty.findUnique.mockResolvedValue(null);

        await expect(
          service.removePropertyFromPortfolio('portfolio-1', 'non-existent', 'user-1'),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('PROD-166: Loan Comparison', () => {
    describe('compareLoanOptions', () => {
      it('should compare multiple loan options', () => {
        const result = service.compareLoanOptions({
          loans: [
            {
              lenderName: 'Bank A',
              loanAmount: 240000,
              interestRate: 7,
              loanTermYears: 30,
              originationFee: 2000,
              closingCosts: 5000,
              points: 0,
            },
            {
              lenderName: 'Bank B',
              loanAmount: 240000,
              interestRate: 6.75,
              loanTermYears: 30,
              originationFee: 3000,
              closingCosts: 6000,
              points: 1,
            },
          ],
        });

        expect(result).toHaveLength(2);
        expect(result.some((r) => r.rank === 1)).toBe(true);
        expect(result.some((r) => r.rank === 2)).toBe(true);
      });

      it('should rank by total cost', () => {
        const result = service.compareLoanOptions({
          loans: [
            {
              lenderName: 'Expensive',
              loanAmount: 200000,
              interestRate: 8,
              loanTermYears: 30,
            },
            {
              lenderName: 'Cheap',
              loanAmount: 200000,
              interestRate: 6,
              loanTermYears: 30,
            },
          ],
        });

        const cheapLoan = result.find((r) => r.lenderName === 'Cheap');
        expect(cheapLoan?.rank).toBe(1);
      });

      it('should calculate effective rate', () => {
        const result = service.compareLoanOptions({
          loans: [
            {
              lenderName: 'Test',
              loanAmount: 200000,
              interestRate: 7,
              loanTermYears: 30,
              points: 1,
            },
          ],
        });

        expect(result[0].effectiveRate).toBeGreaterThan(7);
      });
    });
  });

  describe('PROD-167: Down Payment Assistance', () => {
    describe('findDownPaymentPrograms', () => {
      it('should return matching programs', async () => {
        mockPrismaService.downPaymentProgram.findMany.mockResolvedValue([
          {
            id: 'program-1',
            name: 'First-Time Buyer Program',
            programType: 'GRANT',
            state: 'CA',
            maxIncome: new Prisma.Decimal(100000),
            maxPurchasePrice: new Prisma.Decimal(500000),
            firstTimeBuyer: true,
            minCreditScore: 620,
            maxAmount: new Prisma.Decimal(25000),
            isActive: true,
          },
        ]);

        const result = await service.findDownPaymentPrograms({
          state: 'CA',
          income: 80000,
          purchasePrice: 400000,
          firstTimeBuyer: true,
          creditScore: 700,
        });

        expect(result).toHaveLength(1);
        expect(result[0].isEligible).toBe(true);
      });

      it('should mark ineligible based on income', async () => {
        mockPrismaService.downPaymentProgram.findMany.mockResolvedValue([
          {
            id: 'program-1',
            name: 'Low Income Program',
            programType: 'LOAN',
            maxIncome: new Prisma.Decimal(50000),
            isActive: true,
          },
        ]);

        const result = await service.findDownPaymentPrograms({
          income: 80000,
        });

        expect(result[0].isEligible).toBe(false);
      });

      it('should mark ineligible for non-first-time buyers', async () => {
        mockPrismaService.downPaymentProgram.findMany.mockResolvedValue([
          {
            id: 'program-1',
            name: 'First-Time Only',
            programType: 'GRANT',
            firstTimeBuyer: true,
            isActive: true,
          },
        ]);

        const result = await service.findDownPaymentPrograms({
          firstTimeBuyer: false,
        });

        expect(result[0].isEligible).toBe(false);
      });
    });
  });

  describe('PROD-168: Tax Reporting', () => {
    describe('generateTaxReport', () => {
      it('should generate tax report for year', async () => {
        mockPrismaService.taxReport.findUnique.mockResolvedValue(null);
        mockPrismaService.portfolioProperty.findMany.mockResolvedValue([]);
        mockPrismaService.expense.findMany.mockResolvedValue([]);
        mockPrismaService.lease.findMany.mockResolvedValue([]);
        mockPrismaService.taxReport.create.mockResolvedValue({
          id: 'report-1',
          userId: 'user-1',
          taxYear: 2024,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          rentalIncome: new Prisma.Decimal(0),
          otherIncome: new Prisma.Decimal(0),
          totalIncome: new Prisma.Decimal(0),
          mortgageInterest: new Prisma.Decimal(0),
          propertyTaxes: new Prisma.Decimal(0),
          insurance: new Prisma.Decimal(0),
          repairs: new Prisma.Decimal(0),
          maintenance: new Prisma.Decimal(0),
          utilities: new Prisma.Decimal(0),
          management: new Prisma.Decimal(0),
          professional: new Prisma.Decimal(0),
          depreciation: new Prisma.Decimal(0),
          otherExpenses: new Prisma.Decimal(0),
          totalExpenses: new Prisma.Decimal(0),
          netIncome: new Prisma.Decimal(0),
          status: 'DRAFT',
          createdAt: new Date(),
        });

        const result = await service.generateTaxReport('user-1', {
          taxYear: 2024,
        });

        expect(result.taxYear).toBe(2024);
        expect(result.status).toBe('DRAFT');
      });

      it('should return existing report if already generated', async () => {
        const existingReport = {
          id: 'existing-report',
          userId: 'user-1',
          taxYear: 2024,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          rentalIncome: new Prisma.Decimal(36000),
          otherIncome: new Prisma.Decimal(0),
          totalIncome: new Prisma.Decimal(36000),
          mortgageInterest: new Prisma.Decimal(12000),
          propertyTaxes: new Prisma.Decimal(3600),
          insurance: new Prisma.Decimal(1200),
          repairs: new Prisma.Decimal(2000),
          maintenance: new Prisma.Decimal(1500),
          utilities: new Prisma.Decimal(0),
          management: new Prisma.Decimal(3600),
          professional: new Prisma.Decimal(500),
          depreciation: new Prisma.Decimal(8000),
          otherExpenses: new Prisma.Decimal(0),
          totalExpenses: new Prisma.Decimal(32400),
          netIncome: new Prisma.Decimal(3600),
          status: 'FINAL',
          createdAt: new Date(),
        };

        mockPrismaService.taxReport.findUnique.mockResolvedValue(existingReport);

        const result = await service.generateTaxReport('user-1', {
          taxYear: 2024,
        });

        expect(result.id).toBe('existing-report');
        expect(mockPrismaService.taxReport.create).not.toHaveBeenCalled();
      });
    });

    describe('getTaxReports', () => {
      it('should return user tax reports', async () => {
        mockPrismaService.taxReport.findMany.mockResolvedValue([
          {
            id: 'report-1',
            taxYear: 2024,
            netIncome: new Prisma.Decimal(5000),
          },
          {
            id: 'report-2',
            taxYear: 2023,
            netIncome: new Prisma.Decimal(4500),
          },
        ]);

        const result = await service.getTaxReports('user-1');

        expect(result).toHaveLength(2);
      });
    });
  });

  describe('PROD-169: Cash Flow Projection', () => {
    describe('createCashFlowProjection', () => {
      it('should create cash flow projection', async () => {
        mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
        mockPrismaService.cashFlowProjection.create.mockResolvedValue({
          id: 'projection-1',
          propertyId: mockProperty.id,
          projectionMonths: 12,
          vacancyRate: 5,
          rentGrowthRate: 2,
          expenseGrowthRate: 3,
          projections: [],
          totalProjectedIncome: new Prisma.Decimal(28500),
          totalProjectedExpenses: new Prisma.Decimal(18000),
          totalProjectedCashFlow: new Prisma.Decimal(10500),
          averageMonthlyCashFlow: new Prisma.Decimal(875),
          baseMonthlyRent: new Prisma.Decimal(2500),
          baseMonthlyExpense: new Prisma.Decimal(1500),
          createdAt: new Date(),
        });

        const result = await service.createCashFlowProjection({
          propertyId: mockProperty.id,
          monthlyRent: 2500,
          monthlyExpenses: 1500,
          projectionMonths: 12,
        });

        expect(result.projectionMonths).toBe(12);
        expect(result.projections).toBeDefined();
      });

      it('should throw NotFoundException for non-existent property', async () => {
        mockPrismaService.property.findUnique.mockResolvedValue(null);

        await expect(
          service.createCashFlowProjection({
            propertyId: 'non-existent',
            monthlyRent: 2500,
            monthlyExpenses: 1500,
          }),
        ).rejects.toThrow(NotFoundException);
      });

      it('should apply vacancy rate to income', async () => {
        mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
        mockPrismaService.cashFlowProjection.create.mockImplementation((args) => {
          return Promise.resolve({
            id: 'projection-1',
            ...args.data,
            createdAt: new Date(),
          });
        });

        const result = await service.createCashFlowProjection({
          propertyId: mockProperty.id,
          monthlyRent: 2000,
          monthlyExpenses: 1000,
          vacancyRate: 10,
          projectionMonths: 12,
        });

        // First month income should be 2000 * 0.9 = 1800
        expect(result.projections[0].income).toBeLessThan(2000);
      });

      it('should apply growth rates over time', async () => {
        mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
        mockPrismaService.cashFlowProjection.create.mockImplementation((args) => {
          return Promise.resolve({
            id: 'projection-1',
            ...args.data,
            createdAt: new Date(),
          });
        });

        const result = await service.createCashFlowProjection({
          propertyId: mockProperty.id,
          monthlyRent: 2000,
          monthlyExpenses: 1000,
          rentGrowthRate: 5,
          expenseGrowthRate: 3,
          projectionMonths: 24,
        });

        // Year 2 values should be higher than year 1
        const year1Projection = result.projections[0];
        const year2Projection = result.projections[12];
        expect(year2Projection.income).toBeGreaterThan(year1Projection.income);
      });
    });

    describe('getCashFlowProjections', () => {
      it('should return projections for property', async () => {
        mockPrismaService.cashFlowProjection.findMany.mockResolvedValue([
          {
            id: 'projection-1',
            propertyId: mockProperty.id,
            projectionMonths: 12,
            vacancyRate: 5,
            rentGrowthRate: 2,
            expenseGrowthRate: 3,
            projections: [],
            totalProjectedIncome: new Prisma.Decimal(28500),
            totalProjectedExpenses: new Prisma.Decimal(18000),
            totalProjectedCashFlow: new Prisma.Decimal(10500),
            averageMonthlyCashFlow: new Prisma.Decimal(875),
            createdAt: new Date(),
          },
        ]);

        const result = await service.getCashFlowProjections(mockProperty.id);

        expect(result).toHaveLength(1);
        expect(result[0].propertyId).toBe(mockProperty.id);
      });
    });
  });
});
