import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/database';
import {
  CreateTenantDocumentDto,
  TenantDocumentQueryDto,
  TenantDocumentResponseDto,
  TenantDocumentListResponseDto,
  TenantDocumentTypeEnum,
} from './dto';

@Injectable()
export class TenantDocumentService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: string,
    dto: CreateTenantDocumentDto,
  ): Promise<TenantDocumentResponseDto> {
    // Verify the lease exists and user has access
    const lease = await this.prisma.lease.findUnique({
      where: { id: dto.leaseId },
      include: {
        property: true,
      },
    });

    if (!lease) {
      throw new NotFoundException('Lease not found');
    }

    // Allow both tenant and landlord to upload documents
    if (lease.tenantId !== userId && lease.landlordId !== userId) {
      throw new ForbiddenException('You do not have access to this lease');
    }

    const document = await this.prisma.tenantDocument.create({
      data: {
        leaseId: dto.leaseId,
        type: dto.type,
        name: dto.name,
        description: dto.description,
        documentUrl: dto.documentUrl,
        fileSize: dto.fileSize,
        mimeType: dto.mimeType,
        uploadedById: userId,
      },
      include: {
        lease: {
          include: {
            property: true,
          },
        },
      },
    });

    return this.mapToResponseDto(document);
  }

  async findAll(
    userId: string,
    query: TenantDocumentQueryDto,
  ): Promise<TenantDocumentListResponseDto> {
    const { leaseId, type, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (leaseId) {
      // Verify user has access to this lease
      const lease = await this.prisma.lease.findUnique({
        where: { id: leaseId },
      });

      if (!lease) {
        throw new NotFoundException('Lease not found');
      }

      if (lease.tenantId !== userId && lease.landlordId !== userId) {
        throw new ForbiddenException('You do not have access to this lease');
      }

      where.leaseId = leaseId;
    } else {
      // Get all leases where user is tenant or landlord
      const leases = await this.prisma.lease.findMany({
        where: {
          OR: [{ tenantId: userId }, { landlordId: userId }],
        },
        select: { id: true },
      });

      where.leaseId = { in: leases.map((l) => l.id) };
    }

    if (type) {
      where.type = type;
    }

    // Get documents and count
    const [documents, total] = await Promise.all([
      this.prisma.tenantDocument.findMany({
        where,
        include: {
          lease: {
            include: {
              property: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.tenantDocument.count({ where }),
    ]);

    return {
      data: documents.map((doc) => this.mapToResponseDto(doc)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(
    docId: string,
    userId: string,
  ): Promise<TenantDocumentResponseDto> {
    const document = await this.prisma.tenantDocument.findUnique({
      where: { id: docId },
      include: {
        lease: {
          include: {
            property: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Verify access
    if (
      document.lease.tenantId !== userId &&
      document.lease.landlordId !== userId
    ) {
      throw new ForbiddenException('You do not have access to this document');
    }

    return this.mapToResponseDto(document);
  }

  async delete(docId: string, userId: string): Promise<{ message: string }> {
    const document = await this.prisma.tenantDocument.findUnique({
      where: { id: docId },
      include: {
        lease: true,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Only the uploader or landlord can delete
    if (document.uploadedById !== userId && document.lease.landlordId !== userId) {
      throw new ForbiddenException('You cannot delete this document');
    }

    await this.prisma.tenantDocument.delete({
      where: { id: docId },
    });

    return { message: 'Document deleted successfully' };
  }

  private mapToResponseDto(document: any): TenantDocumentResponseDto {
    return {
      id: document.id,
      leaseId: document.leaseId,
      type: document.type as TenantDocumentTypeEnum,
      name: document.name,
      description: document.description || undefined,
      documentUrl: document.documentUrl,
      fileSize: document.fileSize || undefined,
      mimeType: document.mimeType || undefined,
      uploadedById: document.uploadedById,
      createdAt: document.createdAt,
      propertyTitle: document.lease?.property?.title,
    };
  }
}
