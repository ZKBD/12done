import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database';

export interface CountryResponseDto {
  code: string;
  name: string;
  nativeName?: string;
  phonePrefix: string;
  currency: string;
  isActive: boolean;
}

@Injectable()
export class CountriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(activeOnly = true): Promise<CountryResponseDto[]> {
    const countries = await this.prisma.country.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: 'asc' },
    });

    return countries.map((c) => this.mapToResponseDto(c));
  }

  async findByCode(code: string): Promise<CountryResponseDto> {
    const country = await this.prisma.country.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!country) {
      throw new NotFoundException('Country not found');
    }

    return this.mapToResponseDto(country);
  }

  async seedDefaultCountries(): Promise<{ count: number }> {
    const defaultCountries = [
      { code: 'HU', name: 'Hungary', nativeName: 'Magyarország', phonePrefix: '+36', currency: 'HUF' },
      { code: 'AT', name: 'Austria', nativeName: 'Österreich', phonePrefix: '+43', currency: 'EUR' },
      { code: 'DE', name: 'Germany', nativeName: 'Deutschland', phonePrefix: '+49', currency: 'EUR' },
      { code: 'SK', name: 'Slovakia', nativeName: 'Slovensko', phonePrefix: '+421', currency: 'EUR' },
      { code: 'CZ', name: 'Czech Republic', nativeName: 'Česká republika', phonePrefix: '+420', currency: 'CZK' },
      { code: 'RO', name: 'Romania', nativeName: 'România', phonePrefix: '+40', currency: 'RON' },
      { code: 'PL', name: 'Poland', nativeName: 'Polska', phonePrefix: '+48', currency: 'PLN' },
      { code: 'HR', name: 'Croatia', nativeName: 'Hrvatska', phonePrefix: '+385', currency: 'EUR' },
      { code: 'SI', name: 'Slovenia', nativeName: 'Slovenija', phonePrefix: '+386', currency: 'EUR' },
      { code: 'RS', name: 'Serbia', nativeName: 'Србија', phonePrefix: '+381', currency: 'RSD' },
      { code: 'UA', name: 'Ukraine', nativeName: 'Україна', phonePrefix: '+380', currency: 'UAH' },
      { code: 'GB', name: 'United Kingdom', phonePrefix: '+44', currency: 'GBP' },
      { code: 'US', name: 'United States', phonePrefix: '+1', currency: 'USD' },
      { code: 'ES', name: 'Spain', nativeName: 'España', phonePrefix: '+34', currency: 'EUR' },
      { code: 'FR', name: 'France', phonePrefix: '+33', currency: 'EUR' },
      { code: 'IT', name: 'Italy', nativeName: 'Italia', phonePrefix: '+39', currency: 'EUR' },
      { code: 'PT', name: 'Portugal', phonePrefix: '+351', currency: 'EUR' },
      { code: 'GR', name: 'Greece', nativeName: 'Ελλάδα', phonePrefix: '+30', currency: 'EUR' },
      { code: 'NL', name: 'Netherlands', nativeName: 'Nederland', phonePrefix: '+31', currency: 'EUR' },
      { code: 'BE', name: 'Belgium', nativeName: 'België', phonePrefix: '+32', currency: 'EUR' },
      { code: 'CH', name: 'Switzerland', nativeName: 'Schweiz', phonePrefix: '+41', currency: 'CHF' },
      { code: 'SE', name: 'Sweden', nativeName: 'Sverige', phonePrefix: '+46', currency: 'SEK' },
      { code: 'NO', name: 'Norway', nativeName: 'Norge', phonePrefix: '+47', currency: 'NOK' },
      { code: 'DK', name: 'Denmark', nativeName: 'Danmark', phonePrefix: '+45', currency: 'DKK' },
      { code: 'FI', name: 'Finland', nativeName: 'Suomi', phonePrefix: '+358', currency: 'EUR' },
    ];

    let count = 0;

    for (const country of defaultCountries) {
      await this.prisma.country.upsert({
        where: { code: country.code },
        update: {},
        create: {
          ...country,
          isActive: true,
        },
      });
      count++;
    }

    return { count };
  }

  private mapToResponseDto(country: {
    code: string;
    name: string;
    nativeName: string | null;
    phonePrefix: string;
    currency: string;
    isActive: boolean;
  }): CountryResponseDto {
    return {
      code: country.code,
      name: country.name,
      nativeName: country.nativeName || undefined,
      phonePrefix: country.phonePrefix,
      currency: country.currency,
      isActive: country.isActive,
    };
  }
}
