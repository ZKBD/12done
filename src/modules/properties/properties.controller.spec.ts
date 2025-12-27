import { Test, TestingModule } from '@nestjs/testing';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';
import {
  AvailabilityService,
  InspectionService,
  PricingService,
  MediaService,
  OpenHouseService,
} from './services';
import { PropertyStatus, UserRole, ListingType } from '@prisma/client';

describe('PropertiesController', () => {
  let controller: PropertiesController;
  let propertiesService: jest.Mocked<PropertiesService>;
  let availabilityService: jest.Mocked<AvailabilityService>;
  let inspectionService: jest.Mocked<InspectionService>;
  let pricingService: jest.Mocked<PricingService>;
  let mediaService: jest.Mocked<MediaService>;
  let openHouseService: jest.Mocked<OpenHouseService>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: UserRole.USER,
    status: 'ACTIVE',
  };

  const mockProperty = {
    id: 'property-123',
    title: 'Beautiful Apartment',
    ownerId: 'user-123',
    status: PropertyStatus.ACTIVE,
  };

  const mockAvailabilitySlot = {
    id: 'slot-123',
    propertyId: 'property-123',
    startDate: new Date(),
    endDate: new Date(),
    isAvailable: true,
  };

  const mockInspectionSlot = {
    id: 'inspection-123',
    propertyId: 'property-123',
    date: new Date(),
    startTime: '10:00',
    endTime: '11:00',
    isBooked: false,
  };

  const mockPricingRule = {
    id: 'rule-123',
    propertyId: 'property-123',
    name: 'Weekend Premium',
    priceMultiplier: '1.5',
    isActive: true,
  };

  const mockMedia = {
    id: 'media-123',
    propertyId: 'property-123',
    type: 'IMAGE',
    url: 'https://example.com/image.jpg',
    isPrimary: true,
  };

  const mockFloorPlan = {
    id: 'plan-123',
    propertyId: 'property-123',
    name: 'Ground Floor',
    imageUrl: 'https://example.com/floor.jpg',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PropertiesController],
      providers: [
        {
          provide: PropertiesService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            getMyProperties: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            updateListingTypes: jest.fn(),
            updateStatus: jest.fn(),
            softDelete: jest.fn(),
          },
        },
        {
          provide: AvailabilityService,
          useValue: {
            createSlot: jest.fn(),
            createBulkSlots: jest.fn(),
            getSlots: jest.fn(),
            updateSlot: jest.fn(),
            deleteSlot: jest.fn(),
            calculateCost: jest.fn(),
          },
        },
        {
          provide: InspectionService,
          useValue: {
            createSlot: jest.fn(),
            createBulkSlots: jest.fn(),
            getSlots: jest.fn(),
            bookSlot: jest.fn(),
            cancelBooking: jest.fn(),
            deleteSlot: jest.fn(),
          },
        },
        {
          provide: PricingService,
          useValue: {
            createRule: jest.fn(),
            getRules: jest.fn(),
            updateRule: jest.fn(),
            deleteRule: jest.fn(),
          },
        },
        {
          provide: MediaService,
          useValue: {
            addMedia: jest.fn(),
            getMedia: jest.fn(),
            updateMedia: jest.fn(),
            deleteMedia: jest.fn(),
            reorderMedia: jest.fn(),
            setPrimaryMedia: jest.fn(),
            addFloorPlan: jest.fn(),
            getFloorPlans: jest.fn(),
            updateFloorPlan: jest.fn(),
            deleteFloorPlan: jest.fn(),
          },
        },
        {
          provide: OpenHouseService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            getUpcomingOpenHouses: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PropertiesController>(PropertiesController);
    propertiesService = module.get(PropertiesService);
    availabilityService = module.get(AvailabilityService);
    inspectionService = module.get(InspectionService);
    pricingService = module.get(PricingService);
    mediaService = module.get(MediaService);
    openHouseService = module.get(OpenHouseService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ============ PROPERTY CRUD ============

  describe('create', () => {
    const createDto = {
      title: 'Beautiful Apartment',
      city: 'Budapest',
      country: 'HU',
      listingTypes: [ListingType.FOR_SALE],
      basePrice: '200000',
      currency: 'EUR',
    };

    it('should call propertiesService.create with dto and userId', async () => {
      propertiesService.create.mockResolvedValue(mockProperty as any);

      const result = await controller.create(createDto as any, mockUser);

      expect(propertiesService.create).toHaveBeenCalledWith(createDto, 'user-123');
      expect(result).toEqual(mockProperty);
    });

    it('should propagate service errors', async () => {
      propertiesService.create.mockRejectedValue(new Error('Validation error'));

      await expect(controller.create(createDto as any, mockUser)).rejects.toThrow('Validation error');
    });
  });

  describe('findAll', () => {
    const query = { page: 1, limit: 20, skip: 0, take: 20 } as any;
    const paginatedResponse = {
      data: [mockProperty],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    };

    it('should call propertiesService.findAll with query and user info', async () => {
      propertiesService.findAll.mockResolvedValue(paginatedResponse as any);

      const result = await controller.findAll(query as any, mockUser);

      expect(propertiesService.findAll).toHaveBeenCalledWith(query, 'user-123', UserRole.USER);
      expect(result).toEqual(paginatedResponse);
    });

    it('should handle unauthenticated requests', async () => {
      propertiesService.findAll.mockResolvedValue(paginatedResponse as any);

      await controller.findAll(query as any, undefined);

      expect(propertiesService.findAll).toHaveBeenCalledWith(query, undefined, undefined);
    });
  });

  describe('getMyProperties', () => {
    it('should call propertiesService.getMyProperties with userId and query', async () => {
      const paginatedResponse = { items: [mockProperty], meta: {} };
      propertiesService.getMyProperties.mockResolvedValue(paginatedResponse as any);

      const result = await controller.getMyProperties({} as any, mockUser);

      expect(propertiesService.getMyProperties).toHaveBeenCalledWith('user-123', {});
      expect(result).toEqual(paginatedResponse);
    });
  });

  describe('findById', () => {
    it('should call propertiesService.findById with id and user info', async () => {
      propertiesService.findById.mockResolvedValue(mockProperty as any);

      const result = await controller.findById('property-123', mockUser);

      expect(propertiesService.findById).toHaveBeenCalledWith('property-123', 'user-123', UserRole.USER);
      expect(result).toEqual(mockProperty);
    });

    it('should handle unauthenticated requests', async () => {
      propertiesService.findById.mockResolvedValue(mockProperty as any);

      await controller.findById('property-123', undefined);

      expect(propertiesService.findById).toHaveBeenCalledWith('property-123', undefined, undefined);
    });
  });

  describe('update', () => {
    const updateDto = { title: 'Updated Title' };

    it('should call propertiesService.update with all params', async () => {
      propertiesService.update.mockResolvedValue({ ...mockProperty, title: 'Updated Title' } as any);

      const result = await controller.update('property-123', updateDto as any, mockUser);

      expect(propertiesService.update).toHaveBeenCalledWith(
        'property-123',
        updateDto,
        'user-123',
        UserRole.USER,
      );
      expect(result.title).toBe('Updated Title');
    });
  });

  describe('updateListingTypes', () => {
    it('should call propertiesService.updateListingTypes', async () => {
      propertiesService.updateListingTypes.mockResolvedValue(mockProperty as any);

      await controller.updateListingTypes(
        'property-123',
        [ListingType.FOR_SALE, ListingType.LONG_TERM_RENT],
        mockUser,
      );

      expect(propertiesService.updateListingTypes).toHaveBeenCalledWith(
        'property-123',
        [ListingType.FOR_SALE, ListingType.LONG_TERM_RENT],
        'user-123',
        UserRole.USER,
      );
    });
  });

  describe('updateStatus', () => {
    it('should call propertiesService.updateStatus', async () => {
      propertiesService.updateStatus.mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.PAUSED,
      } as any);

      const result = await controller.updateStatus('property-123', PropertyStatus.PAUSED, mockUser);

      expect(propertiesService.updateStatus).toHaveBeenCalledWith(
        'property-123',
        PropertyStatus.PAUSED,
        'user-123',
        UserRole.USER,
      );
      expect(result.status).toBe(PropertyStatus.PAUSED);
    });
  });

  describe('delete', () => {
    it('should call propertiesService.softDelete', async () => {
      propertiesService.softDelete.mockResolvedValue({ message: 'Deleted' });

      const result = await controller.delete('property-123', mockUser);

      expect(propertiesService.softDelete).toHaveBeenCalledWith(
        'property-123',
        'user-123',
        UserRole.USER,
      );
      expect(result.message).toBe('Deleted');
    });
  });

  // ============ AVAILABILITY ============

  describe('createAvailabilitySlot', () => {
    const createDto = { startDate: '2025-01-01', endDate: '2025-01-07', isAvailable: true };

    it('should call availabilityService.createSlot', async () => {
      availabilityService.createSlot.mockResolvedValue(mockAvailabilitySlot as any);

      const result = await controller.createAvailabilitySlot('property-123', createDto as any, mockUser);

      expect(availabilityService.createSlot).toHaveBeenCalledWith(
        'property-123',
        createDto,
        'user-123',
        UserRole.USER,
      );
      expect(result).toEqual(mockAvailabilitySlot);
    });
  });

  describe('createBulkAvailabilitySlots', () => {
    const bulkDto = { slots: [{ startDate: '2025-01-01', endDate: '2025-01-07' }] };

    it('should call availabilityService.createBulkSlots', async () => {
      availabilityService.createBulkSlots.mockResolvedValue([mockAvailabilitySlot] as any);

      const result = await controller.createBulkAvailabilitySlots('property-123', bulkDto as any, mockUser);

      expect(availabilityService.createBulkSlots).toHaveBeenCalledWith(
        'property-123',
        bulkDto,
        'user-123',
        UserRole.USER,
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('getAvailabilitySlots', () => {
    it('should call availabilityService.getSlots', async () => {
      availabilityService.getSlots.mockResolvedValue([mockAvailabilitySlot] as any);

      const result = await controller.getAvailabilitySlots('property-123', {} as any);

      expect(availabilityService.getSlots).toHaveBeenCalledWith('property-123', {});
      expect(result).toHaveLength(1);
    });
  });

  describe('updateAvailabilitySlot', () => {
    it('should call availabilityService.updateSlot', async () => {
      availabilityService.updateSlot.mockResolvedValue(mockAvailabilitySlot as any);

      await controller.updateAvailabilitySlot('property-123', 'slot-123', { isAvailable: false } as any, mockUser);

      expect(availabilityService.updateSlot).toHaveBeenCalledWith(
        'property-123',
        'slot-123',
        { isAvailable: false },
        'user-123',
        UserRole.USER,
      );
    });
  });

  describe('deleteAvailabilitySlot', () => {
    it('should call availabilityService.deleteSlot', async () => {
      availabilityService.deleteSlot.mockResolvedValue({ message: 'Deleted' });

      await controller.deleteAvailabilitySlot('property-123', 'slot-123', mockUser);

      expect(availabilityService.deleteSlot).toHaveBeenCalledWith(
        'property-123',
        'slot-123',
        'user-123',
        UserRole.USER,
      );
    });
  });

  describe('calculateCost', () => {
    it('should call availabilityService.calculateCost', async () => {
      const costResponse = {
        checkIn: new Date('2025-01-01'),
        checkOut: new Date('2025-01-08'),
        nights: 7,
        basePricePerNight: '100',
        breakdown: [],
        subtotal: '700',
        total: '700',
        currency: 'EUR',
      };
      availabilityService.calculateCost.mockResolvedValue(costResponse);

      const result = await controller.calculateCost('property-123', {
        startDate: '2025-01-01',
        endDate: '2025-01-08',
      } as any);

      expect(availabilityService.calculateCost).toHaveBeenCalledWith('property-123', {
        startDate: '2025-01-01',
        endDate: '2025-01-08',
      });
      expect(result.total).toBe('700');
    });
  });

  // ============ INSPECTIONS ============

  describe('createInspectionSlot', () => {
    const createDto = { date: '2025-01-15', startTime: '10:00', endTime: '11:00' };

    it('should call inspectionService.createSlot', async () => {
      inspectionService.createSlot.mockResolvedValue(mockInspectionSlot as any);

      const result = await controller.createInspectionSlot('property-123', createDto as any, mockUser);

      expect(inspectionService.createSlot).toHaveBeenCalledWith(
        'property-123',
        createDto,
        'user-123',
        UserRole.USER,
      );
      expect(result).toEqual(mockInspectionSlot);
    });
  });

  describe('createBulkInspectionSlots', () => {
    const bulkDto = { slots: [{ date: '2025-01-15', startTime: '10:00', endTime: '11:00' }] };

    it('should call inspectionService.createBulkSlots', async () => {
      inspectionService.createBulkSlots.mockResolvedValue([mockInspectionSlot] as any);

      const result = await controller.createBulkInspectionSlots('property-123', bulkDto as any, mockUser);

      expect(inspectionService.createBulkSlots).toHaveBeenCalledWith(
        'property-123',
        bulkDto,
        'user-123',
        UserRole.USER,
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('getInspectionSlots', () => {
    it('should call inspectionService.getSlots with user info', async () => {
      inspectionService.getSlots.mockResolvedValue([mockInspectionSlot] as any);

      const result = await controller.getInspectionSlots('property-123', {} as any, mockUser);

      expect(inspectionService.getSlots).toHaveBeenCalledWith(
        'property-123',
        {},
        'user-123',
        UserRole.USER,
      );
      expect(result).toHaveLength(1);
    });

    it('should handle unauthenticated requests', async () => {
      inspectionService.getSlots.mockResolvedValue([mockInspectionSlot] as any);

      await controller.getInspectionSlots('property-123', {} as any, undefined);

      expect(inspectionService.getSlots).toHaveBeenCalledWith('property-123', {}, undefined, undefined);
    });
  });

  describe('bookInspection', () => {
    it('should call inspectionService.bookSlot', async () => {
      inspectionService.bookSlot.mockResolvedValue({ ...mockInspectionSlot, isBooked: true } as any);

      const result = await controller.bookInspection('property-123', 'inspection-123', mockUser);

      expect(inspectionService.bookSlot).toHaveBeenCalledWith('property-123', 'inspection-123', 'user-123');
      expect(result.isBooked).toBe(true);
    });
  });

  describe('cancelInspection', () => {
    it('should call inspectionService.cancelBooking', async () => {
      inspectionService.cancelBooking.mockResolvedValue(mockInspectionSlot as any);

      await controller.cancelInspection('property-123', 'inspection-123', mockUser);

      expect(inspectionService.cancelBooking).toHaveBeenCalledWith(
        'property-123',
        'inspection-123',
        'user-123',
        UserRole.USER,
      );
    });
  });

  describe('deleteInspectionSlot', () => {
    it('should call inspectionService.deleteSlot', async () => {
      inspectionService.deleteSlot.mockResolvedValue({ message: 'Deleted' });

      await controller.deleteInspectionSlot('property-123', 'inspection-123', mockUser);

      expect(inspectionService.deleteSlot).toHaveBeenCalledWith(
        'property-123',
        'inspection-123',
        'user-123',
        UserRole.USER,
      );
    });
  });

  // ============ DYNAMIC PRICING ============

  describe('createPricingRule', () => {
    const createDto = { name: 'Weekend', dayOfWeek: 6, priceMultiplier: '1.5' };

    it('should call pricingService.createRule', async () => {
      pricingService.createRule.mockResolvedValue(mockPricingRule as any);

      const result = await controller.createPricingRule('property-123', createDto as any, mockUser);

      expect(pricingService.createRule).toHaveBeenCalledWith(
        'property-123',
        createDto,
        'user-123',
        UserRole.USER,
      );
      expect(result).toEqual(mockPricingRule);
    });
  });

  describe('getPricingRules', () => {
    it('should call pricingService.getRules', async () => {
      pricingService.getRules.mockResolvedValue([mockPricingRule] as any);

      const result = await controller.getPricingRules('property-123', mockUser);

      expect(pricingService.getRules).toHaveBeenCalledWith('property-123', 'user-123', UserRole.USER);
      expect(result).toHaveLength(1);
    });
  });

  describe('updatePricingRule', () => {
    it('should call pricingService.updateRule', async () => {
      pricingService.updateRule.mockResolvedValue(mockPricingRule as any);

      await controller.updatePricingRule('property-123', 'rule-123', { name: 'Updated' } as any, mockUser);

      expect(pricingService.updateRule).toHaveBeenCalledWith(
        'property-123',
        'rule-123',
        { name: 'Updated' },
        'user-123',
        UserRole.USER,
      );
    });
  });

  describe('deletePricingRule', () => {
    it('should call pricingService.deleteRule', async () => {
      pricingService.deleteRule.mockResolvedValue({ message: 'Deleted' });

      await controller.deletePricingRule('property-123', 'rule-123', mockUser);

      expect(pricingService.deleteRule).toHaveBeenCalledWith(
        'property-123',
        'rule-123',
        'user-123',
        UserRole.USER,
      );
    });
  });

  // ============ MEDIA ============

  describe('addMedia', () => {
    const createDto = { type: 'IMAGE', url: 'https://example.com/image.jpg' };

    it('should call mediaService.addMedia', async () => {
      mediaService.addMedia.mockResolvedValue(mockMedia as any);

      const result = await controller.addMedia('property-123', createDto as any, mockUser);

      expect(mediaService.addMedia).toHaveBeenCalledWith(
        'property-123',
        createDto,
        'user-123',
        UserRole.USER,
      );
      expect(result).toEqual(mockMedia);
    });
  });

  describe('getMedia', () => {
    it('should call mediaService.getMedia', async () => {
      mediaService.getMedia.mockResolvedValue([mockMedia] as any);

      const result = await controller.getMedia('property-123');

      expect(mediaService.getMedia).toHaveBeenCalledWith('property-123');
      expect(result).toHaveLength(1);
    });
  });

  describe('updateMedia', () => {
    it('should call mediaService.updateMedia', async () => {
      mediaService.updateMedia.mockResolvedValue(mockMedia as any);

      await controller.updateMedia('property-123', 'media-123', { caption: 'Updated' } as any, mockUser);

      expect(mediaService.updateMedia).toHaveBeenCalledWith(
        'property-123',
        'media-123',
        { caption: 'Updated' },
        'user-123',
        UserRole.USER,
      );
    });
  });

  describe('deleteMedia', () => {
    it('should call mediaService.deleteMedia', async () => {
      mediaService.deleteMedia.mockResolvedValue({ message: 'Deleted' });

      await controller.deleteMedia('property-123', 'media-123', mockUser);

      expect(mediaService.deleteMedia).toHaveBeenCalledWith(
        'property-123',
        'media-123',
        'user-123',
        UserRole.USER,
      );
    });
  });

  describe('reorderMedia', () => {
    it('should call mediaService.reorderMedia', async () => {
      mediaService.reorderMedia.mockResolvedValue([mockMedia] as any);

      await controller.reorderMedia('property-123', { mediaIds: ['media-2', 'media-1'] } as any, mockUser);

      expect(mediaService.reorderMedia).toHaveBeenCalledWith(
        'property-123',
        { mediaIds: ['media-2', 'media-1'] },
        'user-123',
        UserRole.USER,
      );
    });
  });

  describe('setPrimaryMedia', () => {
    it('should call mediaService.setPrimaryMedia', async () => {
      mediaService.setPrimaryMedia.mockResolvedValue(mockMedia as any);

      await controller.setPrimaryMedia('property-123', 'media-123', mockUser);

      expect(mediaService.setPrimaryMedia).toHaveBeenCalledWith(
        'property-123',
        'media-123',
        'user-123',
        UserRole.USER,
      );
    });
  });

  // ============ FLOOR PLANS ============

  describe('addFloorPlan', () => {
    const createDto = { name: 'Ground Floor', imageUrl: 'https://example.com/floor.jpg' };

    it('should call mediaService.addFloorPlan', async () => {
      mediaService.addFloorPlan.mockResolvedValue(mockFloorPlan as any);

      const result = await controller.addFloorPlan('property-123', createDto as any, mockUser);

      expect(mediaService.addFloorPlan).toHaveBeenCalledWith(
        'property-123',
        createDto,
        'user-123',
        UserRole.USER,
      );
      expect(result).toEqual(mockFloorPlan);
    });
  });

  describe('getFloorPlans', () => {
    it('should call mediaService.getFloorPlans', async () => {
      mediaService.getFloorPlans.mockResolvedValue([mockFloorPlan] as any);

      const result = await controller.getFloorPlans('property-123');

      expect(mediaService.getFloorPlans).toHaveBeenCalledWith('property-123');
      expect(result).toHaveLength(1);
    });
  });

  describe('updateFloorPlan', () => {
    it('should call mediaService.updateFloorPlan', async () => {
      mediaService.updateFloorPlan.mockResolvedValue(mockFloorPlan as any);

      await controller.updateFloorPlan('property-123', 'plan-123', { name: 'Updated' } as any, mockUser);

      expect(mediaService.updateFloorPlan).toHaveBeenCalledWith(
        'property-123',
        'plan-123',
        { name: 'Updated' },
        'user-123',
        UserRole.USER,
      );
    });
  });

  describe('deleteFloorPlan', () => {
    it('should call mediaService.deleteFloorPlan', async () => {
      mediaService.deleteFloorPlan.mockResolvedValue({ message: 'Deleted' });

      await controller.deleteFloorPlan('property-123', 'plan-123', mockUser);

      expect(mediaService.deleteFloorPlan).toHaveBeenCalledWith(
        'property-123',
        'plan-123',
        'user-123',
        UserRole.USER,
      );
    });
  });
});
