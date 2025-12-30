import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { TenantDocumentService } from './tenant-document.service';
import { PrismaService } from '@/database';
import { TenantDocumentTypeEnum } from './dto';

describe('TenantDocumentService', () => {
  let service: TenantDocumentService;
  // PrismaService is mocked via mockPrisma

  const mockPrisma = {
    lease: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    tenantDocument: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockTenantId = 'tenant-123';
  const mockLandlordId = 'landlord-456';
  const mockLeaseId = 'lease-abc';
  const mockDocId = 'doc-xyz';
  const mockPropertyId = 'property-789';

  const mockLease = {
    id: mockLeaseId,
    tenantId: mockTenantId,
    landlordId: mockLandlordId,
    property: {
      id: mockPropertyId,
      title: 'Test Property',
    },
  };

  const mockDocument = {
    id: mockDocId,
    leaseId: mockLeaseId,
    type: 'LEASE_AGREEMENT',
    name: 'Test Document',
    description: 'A test document',
    documentUrl: 'https://example.com/doc.pdf',
    fileSize: 1024,
    mimeType: 'application/pdf',
    uploadedById: mockTenantId,
    createdAt: new Date(),
    lease: mockLease,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantDocumentService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TenantDocumentService>(TenantDocumentService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      leaseId: mockLeaseId,
      type: TenantDocumentTypeEnum.LEASE_AGREEMENT,
      name: 'New Document',
      description: 'Description',
      documentUrl: 'https://example.com/new.pdf',
      fileSize: 2048,
      mimeType: 'application/pdf',
    };

    it('should create a document when user is tenant', async () => {
      mockPrisma.lease.findUnique.mockResolvedValue(mockLease);
      mockPrisma.tenantDocument.create.mockResolvedValue({
        ...mockDocument,
        ...createDto,
        uploadedById: mockTenantId,
      });

      const result = await service.create(mockTenantId, createDto);

      expect(result.leaseId).toBe(mockLeaseId);
      expect(result.type).toBe(TenantDocumentTypeEnum.LEASE_AGREEMENT);
      expect(mockPrisma.tenantDocument.create).toHaveBeenCalledWith({
        data: {
          leaseId: mockLeaseId,
          type: TenantDocumentTypeEnum.LEASE_AGREEMENT,
          name: 'New Document',
          description: 'Description',
          documentUrl: 'https://example.com/new.pdf',
          fileSize: 2048,
          mimeType: 'application/pdf',
          uploadedById: mockTenantId,
        },
        include: {
          lease: {
            include: {
              property: true,
            },
          },
        },
      });
    });

    it('should create a document when user is landlord', async () => {
      mockPrisma.lease.findUnique.mockResolvedValue(mockLease);
      mockPrisma.tenantDocument.create.mockResolvedValue({
        ...mockDocument,
        ...createDto,
        uploadedById: mockLandlordId,
      });

      const result = await service.create(mockLandlordId, createDto);

      expect(result).toBeDefined();
      expect(mockPrisma.tenantDocument.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when lease not found', async () => {
      mockPrisma.lease.findUnique.mockResolvedValue(null);

      await expect(service.create(mockTenantId, createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user has no access', async () => {
      mockPrisma.lease.findUnique.mockResolvedValue(mockLease);

      await expect(
        service.create('random-user', createDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAll', () => {
    it('should return documents for a specific lease', async () => {
      mockPrisma.lease.findUnique.mockResolvedValue(mockLease);
      mockPrisma.tenantDocument.findMany.mockResolvedValue([mockDocument]);
      mockPrisma.tenantDocument.count.mockResolvedValue(1);

      const result = await service.findAll(mockTenantId, {
        leaseId: mockLeaseId,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should return documents filtered by type', async () => {
      mockPrisma.lease.findUnique.mockResolvedValue(mockLease);
      mockPrisma.tenantDocument.findMany.mockResolvedValue([mockDocument]);
      mockPrisma.tenantDocument.count.mockResolvedValue(1);

      const result = await service.findAll(mockTenantId, {
        leaseId: mockLeaseId,
        type: TenantDocumentTypeEnum.LEASE_AGREEMENT,
      });

      expect(result.data).toHaveLength(1);
    });

    it('should return all documents across user leases when no leaseId provided', async () => {
      mockPrisma.lease.findMany.mockResolvedValue([
        { id: mockLeaseId },
        { id: 'lease-2' },
      ]);
      mockPrisma.tenantDocument.findMany.mockResolvedValue([
        mockDocument,
        { ...mockDocument, id: 'doc-2', leaseId: 'lease-2' },
      ]);
      mockPrisma.tenantDocument.count.mockResolvedValue(2);

      const result = await service.findAll(mockTenantId, {});

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });

    it('should throw ForbiddenException when user has no access to lease', async () => {
      mockPrisma.lease.findUnique.mockResolvedValue({
        ...mockLease,
        tenantId: 'other-tenant',
        landlordId: 'other-landlord',
      });

      await expect(
        service.findAll(mockTenantId, { leaseId: mockLeaseId }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when lease not found', async () => {
      mockPrisma.lease.findUnique.mockResolvedValue(null);

      await expect(
        service.findAll(mockTenantId, { leaseId: 'non-existent' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return document when user is tenant', async () => {
      mockPrisma.tenantDocument.findUnique.mockResolvedValue(mockDocument);

      const result = await service.findOne(mockDocId, mockTenantId);

      expect(result.id).toBe(mockDocId);
      expect(result.name).toBe('Test Document');
    });

    it('should return document when user is landlord', async () => {
      mockPrisma.tenantDocument.findUnique.mockResolvedValue(mockDocument);

      const result = await service.findOne(mockDocId, mockLandlordId);

      expect(result.id).toBe(mockDocId);
    });

    it('should throw NotFoundException when document not found', async () => {
      mockPrisma.tenantDocument.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne('non-existent', mockTenantId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user has no access', async () => {
      mockPrisma.tenantDocument.findUnique.mockResolvedValue({
        ...mockDocument,
        lease: {
          ...mockLease,
          tenantId: 'other-tenant',
          landlordId: 'other-landlord',
        },
      });

      await expect(
        service.findOne(mockDocId, mockTenantId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('delete', () => {
    it('should delete document when user is the uploader', async () => {
      mockPrisma.tenantDocument.findUnique.mockResolvedValue({
        ...mockDocument,
        uploadedById: mockTenantId,
        lease: mockLease,
      });
      mockPrisma.tenantDocument.delete.mockResolvedValue(mockDocument);

      const result = await service.delete(mockDocId, mockTenantId);

      expect(result.message).toBe('Document deleted successfully');
      expect(mockPrisma.tenantDocument.delete).toHaveBeenCalledWith({
        where: { id: mockDocId },
      });
    });

    it('should delete document when user is landlord', async () => {
      mockPrisma.tenantDocument.findUnique.mockResolvedValue({
        ...mockDocument,
        uploadedById: mockTenantId,
        lease: mockLease,
      });
      mockPrisma.tenantDocument.delete.mockResolvedValue(mockDocument);

      const result = await service.delete(mockDocId, mockLandlordId);

      expect(result.message).toBe('Document deleted successfully');
    });

    it('should throw NotFoundException when document not found', async () => {
      mockPrisma.tenantDocument.findUnique.mockResolvedValue(null);

      await expect(
        service.delete('non-existent', mockTenantId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when tenant tries to delete other user document', async () => {
      mockPrisma.tenantDocument.findUnique.mockResolvedValue({
        ...mockDocument,
        uploadedById: 'other-user',
        lease: {
          ...mockLease,
          landlordId: 'other-landlord',
        },
      });

      await expect(
        service.delete(mockDocId, mockTenantId),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
