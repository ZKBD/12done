import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CountriesService } from './countries.service';
import { PrismaService } from '@/database';

describe('CountriesService', () => {
  let service: CountriesService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockCountryHU = {
    code: 'HU',
    name: 'Hungary',
    nativeName: 'Magyarország',
    phonePrefix: '+36',
    currency: 'HUF',
    isActive: true,
  };

  const mockCountryAT = {
    code: 'AT',
    name: 'Austria',
    nativeName: 'Österreich',
    phonePrefix: '+43',
    currency: 'EUR',
    isActive: true,
  };

  const mockCountryGB = {
    code: 'GB',
    name: 'United Kingdom',
    nativeName: null,
    phonePrefix: '+44',
    currency: 'GBP',
    isActive: true,
  };

  const mockInactiveCountry = {
    code: 'XX',
    name: 'Inactive Country',
    nativeName: null,
    phonePrefix: '+99',
    currency: 'XXX',
    isActive: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CountriesService,
        {
          provide: PrismaService,
          useValue: {
            country: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              upsert: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<CountriesService>(CountriesService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all active countries by default', async () => {
      (prismaService.country.findMany as jest.Mock).mockResolvedValue([
        mockCountryHU,
        mockCountryAT,
        mockCountryGB,
      ]);

      const result = await service.findAll();

      expect(result).toHaveLength(3);
      expect(prismaService.country.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });
    });

    it('should return all countries when activeOnly is false', async () => {
      (prismaService.country.findMany as jest.Mock).mockResolvedValue([
        mockCountryHU,
        mockCountryAT,
        mockInactiveCountry,
      ]);

      const result = await service.findAll(false);

      expect(result).toHaveLength(3);
      expect(prismaService.country.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { name: 'asc' },
      });
    });

    it('should return active countries when activeOnly is true', async () => {
      (prismaService.country.findMany as jest.Mock).mockResolvedValue([
        mockCountryHU,
        mockCountryAT,
      ]);

      const result = await service.findAll(true);

      expect(result).toHaveLength(2);
      expect(prismaService.country.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });
    });

    it('should order by name ascending', async () => {
      (prismaService.country.findMany as jest.Mock).mockResolvedValue([
        mockCountryAT,
        mockCountryGB,
        mockCountryHU,
      ]);

      await service.findAll();

      expect(prismaService.country.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' },
        }),
      );
    });

    it('should return empty array when no countries', async () => {
      (prismaService.country.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toHaveLength(0);
    });

    it('should map countries to response DTOs', async () => {
      (prismaService.country.findMany as jest.Mock).mockResolvedValue([mockCountryHU]);

      const result = await service.findAll();

      expect(result[0]).toEqual({
        code: 'HU',
        name: 'Hungary',
        nativeName: 'Magyarország',
        phonePrefix: '+36',
        currency: 'HUF',
        isActive: true,
      });
    });
  });

  describe('findByCode', () => {
    it('should return country by code', async () => {
      (prismaService.country.findUnique as jest.Mock).mockResolvedValue(mockCountryHU);

      const result = await service.findByCode('HU');

      expect(result.code).toBe('HU');
      expect(result.name).toBe('Hungary');
      expect(prismaService.country.findUnique).toHaveBeenCalledWith({
        where: { code: 'HU' },
      });
    });

    it('should throw NotFoundException if country not found', async () => {
      (prismaService.country.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findByCode('XX')).rejects.toThrow(NotFoundException);
    });

    it('should convert code to uppercase', async () => {
      (prismaService.country.findUnique as jest.Mock).mockResolvedValue(mockCountryHU);

      await service.findByCode('hu');

      expect(prismaService.country.findUnique).toHaveBeenCalledWith({
        where: { code: 'HU' },
      });
    });

    it('should handle mixed case code', async () => {
      (prismaService.country.findUnique as jest.Mock).mockResolvedValue(mockCountryGB);

      await service.findByCode('Gb');

      expect(prismaService.country.findUnique).toHaveBeenCalledWith({
        where: { code: 'GB' },
      });
    });

    it('should return correct DTO for country without nativeName', async () => {
      (prismaService.country.findUnique as jest.Mock).mockResolvedValue(mockCountryGB);

      const result = await service.findByCode('GB');

      expect(result.nativeName).toBeUndefined();
      expect(result.name).toBe('United Kingdom');
    });
  });

  describe('seedDefaultCountries', () => {
    it('should seed all default countries', async () => {
      (prismaService.country.upsert as jest.Mock).mockResolvedValue({});

      const result = await service.seedDefaultCountries();

      expect(result.count).toBe(25); // 25 default countries
      expect(prismaService.country.upsert).toHaveBeenCalledTimes(25);
    });

    it('should use upsert for each country', async () => {
      (prismaService.country.upsert as jest.Mock).mockResolvedValue({});

      await service.seedDefaultCountries();

      expect(prismaService.country.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { code: 'HU' },
          update: {},
          create: expect.objectContaining({
            code: 'HU',
            name: 'Hungary',
            nativeName: 'Magyarország',
            phonePrefix: '+36',
            currency: 'HUF',
            isActive: true,
          }),
        }),
      );
    });

    it('should set isActive to true for all seeded countries', async () => {
      (prismaService.country.upsert as jest.Mock).mockResolvedValue({});

      await service.seedDefaultCountries();

      const calls = (prismaService.country.upsert as jest.Mock).mock.calls;
      for (const call of calls) {
        expect(call[0].create.isActive).toBe(true);
      }
    });

    it('should not update existing countries', async () => {
      (prismaService.country.upsert as jest.Mock).mockResolvedValue({});

      await service.seedDefaultCountries();

      const calls = (prismaService.country.upsert as jest.Mock).mock.calls;
      for (const call of calls) {
        expect(call[0].update).toEqual({});
      }
    });

    it('should include all Central European countries', async () => {
      (prismaService.country.upsert as jest.Mock).mockResolvedValue({});

      await service.seedDefaultCountries();

      const countryCodes = (prismaService.country.upsert as jest.Mock).mock.calls.map(
        (call) => call[0].where.code,
      );

      expect(countryCodes).toContain('HU');
      expect(countryCodes).toContain('AT');
      expect(countryCodes).toContain('DE');
      expect(countryCodes).toContain('SK');
      expect(countryCodes).toContain('CZ');
      expect(countryCodes).toContain('RO');
      expect(countryCodes).toContain('PL');
    });

    it('should include Western European countries', async () => {
      (prismaService.country.upsert as jest.Mock).mockResolvedValue({});

      await service.seedDefaultCountries();

      const countryCodes = (prismaService.country.upsert as jest.Mock).mock.calls.map(
        (call) => call[0].where.code,
      );

      expect(countryCodes).toContain('GB');
      expect(countryCodes).toContain('FR');
      expect(countryCodes).toContain('ES');
      expect(countryCodes).toContain('IT');
      expect(countryCodes).toContain('PT');
      expect(countryCodes).toContain('NL');
      expect(countryCodes).toContain('BE');
    });

    it('should include Nordic countries', async () => {
      (prismaService.country.upsert as jest.Mock).mockResolvedValue({});

      await service.seedDefaultCountries();

      const countryCodes = (prismaService.country.upsert as jest.Mock).mock.calls.map(
        (call) => call[0].where.code,
      );

      expect(countryCodes).toContain('SE');
      expect(countryCodes).toContain('NO');
      expect(countryCodes).toContain('DK');
      expect(countryCodes).toContain('FI');
    });

    it('should include US', async () => {
      (prismaService.country.upsert as jest.Mock).mockResolvedValue({});

      await service.seedDefaultCountries();

      const calls = (prismaService.country.upsert as jest.Mock).mock.calls;
      const usCall = calls.find((call) => call[0].where.code === 'US');

      expect(usCall).toBeDefined();
      expect(usCall[0].create).toEqual(
        expect.objectContaining({
          code: 'US',
          name: 'United States',
          phonePrefix: '+1',
          currency: 'USD',
        }),
      );
    });
  });

  describe('response mapping', () => {
    it('should correctly map country to response DTO', async () => {
      (prismaService.country.findUnique as jest.Mock).mockResolvedValue(mockCountryHU);

      const result = await service.findByCode('HU');

      expect(result.code).toBe('HU');
      expect(result.name).toBe('Hungary');
      expect(result.nativeName).toBe('Magyarország');
      expect(result.phonePrefix).toBe('+36');
      expect(result.currency).toBe('HUF');
      expect(result.isActive).toBe(true);
    });

    it('should handle null nativeName', async () => {
      (prismaService.country.findUnique as jest.Mock).mockResolvedValue(mockCountryGB);

      const result = await service.findByCode('GB');

      expect(result.nativeName).toBeUndefined();
    });

    it('should include nativeName when present', async () => {
      (prismaService.country.findUnique as jest.Mock).mockResolvedValue(mockCountryAT);

      const result = await service.findByCode('AT');

      expect(result.nativeName).toBe('Österreich');
    });

    it('should map inactive country correctly', async () => {
      (prismaService.country.findUnique as jest.Mock).mockResolvedValue(mockInactiveCountry);

      const result = await service.findByCode('XX');

      expect(result.isActive).toBe(false);
    });

    it('should preserve all fields in mapping', async () => {
      (prismaService.country.findMany as jest.Mock).mockResolvedValue([
        mockCountryHU,
        mockCountryAT,
        mockCountryGB,
      ]);

      const result = await service.findAll();

      result.forEach((country) => {
        expect(country).toHaveProperty('code');
        expect(country).toHaveProperty('name');
        expect(country).toHaveProperty('phonePrefix');
        expect(country).toHaveProperty('currency');
        expect(country).toHaveProperty('isActive');
      });
    });
  });

  describe('currency mapping', () => {
    it('should return EUR for Eurozone countries', async () => {
      (prismaService.country.findUnique as jest.Mock).mockResolvedValue(mockCountryAT);

      const result = await service.findByCode('AT');

      expect(result.currency).toBe('EUR');
    });

    it('should return local currency for non-Eurozone countries', async () => {
      (prismaService.country.findUnique as jest.Mock).mockResolvedValue(mockCountryHU);

      const result = await service.findByCode('HU');

      expect(result.currency).toBe('HUF');
    });

    it('should return GBP for UK', async () => {
      (prismaService.country.findUnique as jest.Mock).mockResolvedValue(mockCountryGB);

      const result = await service.findByCode('GB');

      expect(result.currency).toBe('GBP');
    });
  });

  describe('phone prefix mapping', () => {
    it('should return correct phone prefix', async () => {
      (prismaService.country.findUnique as jest.Mock).mockResolvedValue(mockCountryHU);

      const result = await service.findByCode('HU');

      expect(result.phonePrefix).toBe('+36');
    });

    it('should include + prefix in phone prefix', async () => {
      (prismaService.country.findMany as jest.Mock).mockResolvedValue([
        mockCountryHU,
        mockCountryAT,
        mockCountryGB,
      ]);

      const result = await service.findAll();

      result.forEach((country) => {
        expect(country.phonePrefix).toMatch(/^\+\d+$/);
      });
    });
  });
});
