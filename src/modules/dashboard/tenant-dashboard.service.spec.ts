import { Test, TestingModule } from '@nestjs/testing';
import { TenantDashboardService } from './tenant-dashboard.service';
import { PrismaService } from '@/database';
import { Decimal } from '@prisma/client/runtime/library';

describe('TenantDashboardService', () => {
  let service: TenantDashboardService;
  let _prisma: PrismaService;

  const mockPrisma = {
    lease: {
      findMany: jest.fn(),
    },
    rentPayment: {
      findMany: jest.fn(),
    },
    maintenanceRequest: {
      findMany: jest.fn(),
    },
    leaseRenewal: {
      findMany: jest.fn(),
    },
    conversationParticipant: {
      aggregate: jest.fn(),
    },
    tenantDocument: {
      count: jest.fn(),
    },
  };

  const mockTenantId = 'tenant-123';
  const mockLandlordId = 'landlord-456';
  const mockPropertyId = 'property-789';
  const mockLeaseId = 'lease-abc';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantDashboardService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TenantDashboardService>(TenantDashboardService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('getTenantDashboard', () => {
    it('should return aggregated dashboard data', async () => {
      // Mock data
      const mockLeases = [
        {
          id: mockLeaseId,
          propertyId: mockPropertyId,
          tenantId: mockTenantId,
          landlordId: mockLandlordId,
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          rentAmount: new Decimal(1500),
          currency: 'EUR',
          dueDay: 1,
          status: 'ACTIVE',
          securityDeposit: new Decimal(3000),
          securityDepositPaid: true,
          landlordSignedAt: new Date(),
          tenantSignedAt: new Date(),
          documentUrl: 'https://example.com/lease.pdf',
          property: {
            id: mockPropertyId,
            title: 'Test Property',
            address: '123 Test St',
            city: 'Test City',
            media: [{ url: 'https://example.com/image.jpg' }],
          },
          landlord: {
            id: mockLandlordId,
            firstName: 'John',
            lastName: 'Landlord',
            email: 'landlord@example.com',
            phone: '+1234567890',
          },
        },
      ];

      const mockPayments = [
        {
          id: 'payment-1',
          leaseId: mockLeaseId,
          dueDate: new Date('2025-02-01'),
          amount: new Decimal(1500),
          currency: 'EUR',
          status: 'PENDING',
          paidAt: null,
          paidAmount: null,
          lease: {
            property: { title: 'Test Property' },
          },
        },
      ];

      const mockMaintenanceRequests = [
        {
          id: 'maint-1',
          title: 'Fix sink',
          type: 'PLUMBING',
          status: 'SUBMITTED',
          priority: 'HIGH',
          scheduledDate: null,
          createdAt: new Date(),
          property: { title: 'Test Property' },
        },
      ];

      const mockRenewals = [
        {
          id: 'renewal-1',
          leaseId: mockLeaseId,
          tenantId: mockTenantId,
          status: 'OFFERED',
          proposedStartDate: new Date('2026-01-01'),
          proposedEndDate: new Date('2026-12-31'),
          proposedRentAmount: new Decimal(1600),
          proposedTerms: 'New terms',
          offerExpiresAt: new Date('2025-12-15'),
          lease: {
            property: { title: 'Test Property' },
          },
        },
      ];

      mockPrisma.lease.findMany
        .mockResolvedValueOnce(mockLeases) // getActiveLeases
        .mockResolvedValueOnce([{ id: mockLeaseId }]); // getDocumentsCount (lease IDs)

      mockPrisma.rentPayment.findMany
        .mockResolvedValueOnce(mockPayments) // getUpcomingPayments
        .mockResolvedValueOnce([]); // getOverduePayments

      mockPrisma.maintenanceRequest.findMany.mockResolvedValue(
        mockMaintenanceRequests,
      );
      mockPrisma.leaseRenewal.findMany.mockResolvedValue(mockRenewals);
      mockPrisma.conversationParticipant.aggregate.mockResolvedValue({
        _sum: { unreadCount: 5 },
      });
      mockPrisma.tenantDocument.count.mockResolvedValue(3);

      const result = await service.getTenantDashboard(mockTenantId, {});

      expect(result.activeLeases).toBe(1);
      expect(result.totalMonthlyRent).toBe(1500);
      expect(result.currency).toBe('EUR');
      expect(result.pendingMaintenanceRequests).toBe(1);
      expect(result.unreadMessages).toBe(5);
      expect(result.pendingRenewals).toBe(1);
      expect(result.documentsCount).toBe(3);
      expect(result.leases).toHaveLength(1);
      expect(result.upcomingPayments).toHaveLength(1);
      expect(result.overduePayments).toHaveLength(0);
      expect(result.maintenanceRequests).toHaveLength(1);
      expect(result.renewalOffers).toHaveLength(1);
    });

    it('should handle empty data correctly', async () => {
      mockPrisma.lease.findMany.mockResolvedValue([]);
      mockPrisma.rentPayment.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceRequest.findMany.mockResolvedValue([]);
      mockPrisma.leaseRenewal.findMany.mockResolvedValue([]);
      mockPrisma.conversationParticipant.aggregate.mockResolvedValue({
        _sum: { unreadCount: null },
      });
      mockPrisma.tenantDocument.count.mockResolvedValue(0);

      const result = await service.getTenantDashboard(mockTenantId, {});

      expect(result.activeLeases).toBe(0);
      expect(result.totalMonthlyRent).toBe(0);
      expect(result.currency).toBe('EUR');
      expect(result.pendingMaintenanceRequests).toBe(0);
      expect(result.unreadMessages).toBe(0);
      expect(result.pendingRenewals).toBe(0);
      expect(result.documentsCount).toBe(0);
      expect(result.leases).toHaveLength(0);
    });

    it('should correctly map lease data to DTO', async () => {
      const mockLease = {
        id: mockLeaseId,
        propertyId: mockPropertyId,
        tenantId: mockTenantId,
        landlordId: mockLandlordId,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        rentAmount: new Decimal(2000),
        currency: 'USD',
        dueDay: 15,
        status: 'DRAFT',
        securityDeposit: null,
        securityDepositPaid: false,
        landlordSignedAt: new Date(),
        tenantSignedAt: null,
        documentUrl: null,
        property: {
          id: mockPropertyId,
          title: 'Draft Property',
          address: '456 Draft St',
          city: 'Draft City',
          media: [],
        },
        landlord: {
          id: mockLandlordId,
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          phone: null,
        },
      };

      mockPrisma.lease.findMany
        .mockResolvedValueOnce([mockLease])
        .mockResolvedValueOnce([{ id: mockLeaseId }]);
      mockPrisma.rentPayment.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceRequest.findMany.mockResolvedValue([]);
      mockPrisma.leaseRenewal.findMany.mockResolvedValue([]);
      mockPrisma.conversationParticipant.aggregate.mockResolvedValue({
        _sum: { unreadCount: 0 },
      });
      mockPrisma.tenantDocument.count.mockResolvedValue(0);

      const result = await service.getTenantDashboard(mockTenantId, {});

      expect(result.leases[0]).toMatchObject({
        id: mockLeaseId,
        status: 'DRAFT',
        rentAmount: 2000,
        currency: 'USD',
        dueDay: 15,
        landlordSigned: true,
        tenantSigned: false,
        securityDeposit: null,
        securityDepositPaid: false,
      });
      expect(result.leases[0].property.title).toBe('Draft Property');
      expect(result.leases[0].landlord.firstName).toBe('Jane');
    });

    it('should correctly calculate total monthly rent from multiple leases', async () => {
      const mockLeases = [
        {
          id: 'lease-1',
          propertyId: 'prop-1',
          tenantId: mockTenantId,
          landlordId: mockLandlordId,
          startDate: new Date(),
          endDate: new Date(),
          rentAmount: new Decimal(1000),
          currency: 'EUR',
          dueDay: 1,
          status: 'ACTIVE',
          securityDeposit: null,
          securityDepositPaid: false,
          landlordSignedAt: null,
          tenantSignedAt: null,
          documentUrl: null,
          property: {
            id: 'prop-1',
            title: 'Property 1',
            address: 'Address 1',
            city: 'City 1',
            media: [],
          },
          landlord: {
            id: mockLandlordId,
            firstName: 'Test',
            lastName: 'Landlord',
            email: 'test@example.com',
            phone: null,
          },
        },
        {
          id: 'lease-2',
          propertyId: 'prop-2',
          tenantId: mockTenantId,
          landlordId: mockLandlordId,
          startDate: new Date(),
          endDate: new Date(),
          rentAmount: new Decimal(1500),
          currency: 'EUR',
          dueDay: 1,
          status: 'ACTIVE',
          securityDeposit: null,
          securityDepositPaid: false,
          landlordSignedAt: null,
          tenantSignedAt: null,
          documentUrl: null,
          property: {
            id: 'prop-2',
            title: 'Property 2',
            address: 'Address 2',
            city: 'City 2',
            media: [],
          },
          landlord: {
            id: mockLandlordId,
            firstName: 'Test',
            lastName: 'Landlord',
            email: 'test@example.com',
            phone: null,
          },
        },
      ];

      mockPrisma.lease.findMany
        .mockResolvedValueOnce(mockLeases)
        .mockResolvedValueOnce([{ id: 'lease-1' }, { id: 'lease-2' }]);
      mockPrisma.rentPayment.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceRequest.findMany.mockResolvedValue([]);
      mockPrisma.leaseRenewal.findMany.mockResolvedValue([]);
      mockPrisma.conversationParticipant.aggregate.mockResolvedValue({
        _sum: { unreadCount: 0 },
      });
      mockPrisma.tenantDocument.count.mockResolvedValue(0);

      const result = await service.getTenantDashboard(mockTenantId, {});

      expect(result.totalMonthlyRent).toBe(2500);
      expect(result.activeLeases).toBe(2);
    });
  });
});
