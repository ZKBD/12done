import { Test, TestingModule } from '@nestjs/testing';
import { RentReminderService } from './rent-reminder.service';
import { PrismaService } from '@/database';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '@/mail/mail.service';
import { RentPaymentStatus, LeaseStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('RentReminderService', () => {
  let service: RentReminderService;

  const mockPrismaService = {
    rentPayment: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    lease: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockNotificationsService = {
    create: jest.fn(),
  };

  const mockMailService = {
    sendRentReminderEmail: jest.fn(),
    sendRentOverdueEmail: jest.fn(),
  };

  const mockProperty = {
    id: 'property-123',
    title: 'Test Apartment',
    address: '123 Test St',
    city: 'Budapest',
    country: 'HU',
  };

  const mockTenant = {
    id: 'tenant-456',
    email: 'tenant@example.com',
    firstName: 'John',
    lastName: 'Doe',
  };

  const mockLandlord = {
    id: 'landlord-789',
    email: 'landlord@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
  };

  const createMockPayment = (daysFromNow: number, status: RentPaymentStatus = 'PENDING') => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + daysFromNow);
    dueDate.setHours(12, 0, 0, 0);

    return {
      id: `payment-${daysFromNow}`,
      leaseId: 'lease-123',
      dueDate,
      amount: new Decimal(1500),
      currency: 'EUR',
      status,
      paidAt: null,
      paidAmount: null,
      paymentMethod: null,
      transactionRef: null,
      reminderSentAt: null,
      overdueSentAt: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lease: {
        id: 'lease-123',
        propertyId: 'property-123',
        tenantId: 'tenant-456',
        landlordId: 'landlord-789',
        status: 'ACTIVE' as LeaseStatus,
        property: mockProperty,
        tenant: mockTenant,
        landlord: mockLandlord,
      },
    };
  };

  const createMockLease = (status: LeaseStatus = 'ACTIVE') => {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1); // Expired yesterday

    return {
      id: 'lease-123',
      propertyId: 'property-123',
      tenantId: 'tenant-456',
      landlordId: 'landlord-789',
      startDate: new Date('2024-01-01'),
      endDate,
      rentAmount: new Decimal(1500),
      currency: 'EUR',
      dueDay: 1,
      status,
      property: mockProperty,
      tenant: mockTenant,
    };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RentReminderService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<RentReminderService>(RentReminderService);

    jest.clearAllMocks();
  });

  describe('sendRentReminders', () => {
    it('should send reminders for payments due in 5 days', async () => {
      const upcomingPayment = createMockPayment(5);
      mockPrismaService.rentPayment.findMany.mockResolvedValue([upcomingPayment]);
      mockPrismaService.rentPayment.update.mockResolvedValue(upcomingPayment);

      await service.sendRentReminders();

      expect(mockMailService.sendRentReminderEmail).toHaveBeenCalledWith(
        mockTenant.email,
        mockTenant.firstName,
        mockProperty.title,
        1500,
        'EUR',
        expect.any(String),
      );
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        mockTenant.id,
        'RENT_REMINDER_TENANT',
        'Rent Due Soon',
        expect.any(String),
        expect.objectContaining({
          leaseId: 'lease-123',
          paymentId: upcomingPayment.id,
        }),
      );
      expect(mockPrismaService.rentPayment.update).toHaveBeenCalledWith({
        where: { id: upcomingPayment.id },
        data: { reminderSentAt: expect.any(Date) },
      });
    });

    it('should not send reminders for payments with reminderSentAt set', async () => {
      mockPrismaService.rentPayment.findMany.mockResolvedValue([]);

      await service.sendRentReminders();

      expect(mockMailService.sendRentReminderEmail).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully for individual payments', async () => {
      const payment1 = createMockPayment(3);
      const payment2 = createMockPayment(4);
      mockPrismaService.rentPayment.findMany.mockResolvedValue([payment1, payment2]);
      mockMailService.sendRentReminderEmail
        .mockRejectedValueOnce(new Error('Email failed'))
        .mockResolvedValueOnce(undefined);
      mockPrismaService.rentPayment.update.mockResolvedValue(payment2);

      await service.sendRentReminders();

      // Should continue processing despite first error
      expect(mockMailService.sendRentReminderEmail).toHaveBeenCalledTimes(2);
    });
  });

  describe('checkOverduePayments', () => {
    it('should mark pending payments as overdue and notify', async () => {
      const overduePayment = createMockPayment(-3); // 3 days ago
      mockPrismaService.rentPayment.findMany.mockResolvedValue([overduePayment]);
      mockPrismaService.rentPayment.update.mockResolvedValue({
        ...overduePayment,
        status: 'OVERDUE',
      });

      await service.checkOverduePayments();

      expect(mockPrismaService.rentPayment.update).toHaveBeenCalledWith({
        where: { id: overduePayment.id },
        data: { status: 'OVERDUE' },
      });
      expect(mockMailService.sendRentOverdueEmail).toHaveBeenCalledWith(
        mockTenant.email,
        mockTenant.firstName,
        mockProperty.title,
        1500,
        'EUR',
        expect.any(Number),
      );
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        mockTenant.id,
        'RENT_OVERDUE_TENANT',
        'Rent Payment Overdue',
        expect.any(String),
        expect.any(Object),
      );
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        mockLandlord.id,
        'RENT_OVERDUE_LANDLORD',
        'Tenant Payment Overdue',
        expect.any(String),
        expect.any(Object),
      );
    });

    it('should not send duplicate notifications within 7 days', async () => {
      const overduePayment = {
        ...createMockPayment(-3),
        overdueSentAt: new Date(), // Sent today
      };
      mockPrismaService.rentPayment.findMany.mockResolvedValue([overduePayment]);
      mockPrismaService.rentPayment.update.mockResolvedValue({
        ...overduePayment,
        status: 'OVERDUE',
      });

      await service.checkOverduePayments();

      // Should update status but not send notification
      expect(mockPrismaService.rentPayment.update).toHaveBeenCalledWith({
        where: { id: overduePayment.id },
        data: { status: 'OVERDUE' },
      });
      expect(mockMailService.sendRentOverdueEmail).not.toHaveBeenCalled();
    });

    it('should resend notification after 7 days', async () => {
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

      const overduePayment = {
        ...createMockPayment(-10),
        overdueSentAt: eightDaysAgo,
      };
      mockPrismaService.rentPayment.findMany.mockResolvedValue([overduePayment]);
      mockPrismaService.rentPayment.update.mockResolvedValue({
        ...overduePayment,
        status: 'OVERDUE',
      });

      await service.checkOverduePayments();

      expect(mockMailService.sendRentOverdueEmail).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const overduePayment = createMockPayment(-3);
      mockPrismaService.rentPayment.findMany.mockResolvedValue([overduePayment]);
      mockPrismaService.rentPayment.update.mockRejectedValue(new Error('DB error'));

      // Should not throw
      await expect(service.checkOverduePayments()).resolves.not.toThrow();
    });
  });

  describe('checkExpiredLeases', () => {
    it('should mark expired leases and notify both parties', async () => {
      const expiredLease = createMockLease('ACTIVE');
      mockPrismaService.lease.findMany.mockResolvedValue([expiredLease]);
      mockPrismaService.lease.update.mockResolvedValue({
        ...expiredLease,
        status: 'EXPIRED',
      });

      await service.checkExpiredLeases();

      expect(mockPrismaService.lease.update).toHaveBeenCalledWith({
        where: { id: expiredLease.id },
        data: { status: 'EXPIRED' },
      });
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        mockTenant.id,
        'RENT_REMINDER_TENANT',
        'Lease Expired',
        expect.stringContaining(mockProperty.title),
        expect.any(Object),
      );
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        mockLandlord.id,
        'RENT_PAYMENT_RECEIVED',
        'Lease Expired',
        expect.stringContaining(mockProperty.title),
        expect.any(Object),
      );
    });

    it('should not process non-active leases', async () => {
      mockPrismaService.lease.findMany.mockResolvedValue([]);

      await service.checkExpiredLeases();

      expect(mockPrismaService.lease.update).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const expiredLease = createMockLease('ACTIVE');
      mockPrismaService.lease.findMany.mockResolvedValue([expiredLease]);
      mockPrismaService.lease.update.mockRejectedValue(new Error('DB error'));

      // Should not throw
      await expect(service.checkExpiredLeases()).resolves.not.toThrow();
    });
  });
});
