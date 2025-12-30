import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { DescriptionTone, UserRole, ListingType } from '@prisma/client';
import {
  GenerateDescriptionDto,
  AiDescriptionResponseDto,
} from '../dto/ai-description.dto';

interface PropertyData {
  title: string;
  address: string;
  city: string;
  country: string;
  listingTypes: ListingType[];
  basePrice: number;
  currency: string;
  squareMeters?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  floors?: number | null;
  yearBuilt?: number | null;
  petFriendly: boolean;
  newlyBuilt: boolean;
  accessible: boolean;
  energyEfficiency: string;
  lotSize?: number | null;
}

@Injectable()
export class AiDescriptionService {
  private readonly logger = new Logger(AiDescriptionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate an AI description for a property (PROD-029.1)
   */
  async generateDescription(
    propertyId: string,
    userId: string,
    userRole: UserRole,
    dto: GenerateDescriptionDto,
  ): Promise<AiDescriptionResponseDto> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    // Check ownership (owner or admin can generate)
    if (property.ownerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only property owner can generate descriptions');
    }

    const tone = dto.tone || DescriptionTone.MODERN_PROFESSIONAL;
    const description = this.buildDescription(
      {
        title: property.title,
        address: property.address,
        city: property.city,
        country: property.country,
        listingTypes: property.listingTypes,
        basePrice: Number(property.basePrice),
        currency: property.currency,
        squareMeters: property.squareMeters,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        floors: property.floors,
        yearBuilt: property.yearBuilt,
        petFriendly: property.petFriendly,
        newlyBuilt: property.newlyBuilt,
        accessible: property.accessible,
        energyEfficiency: property.energyEfficiency,
        lotSize: property.lotSize,
      },
      tone,
    );

    this.logger.log(`Generated ${tone} description for property ${propertyId}`);

    return {
      propertyId,
      description,
      tone,
      wordCount: description.split(/\s+/).length,
      generatedAt: new Date(),
    };
  }

  /**
   * Save the generated description to the property (PROD-029.6)
   */
  async saveDescription(
    propertyId: string,
    userId: string,
    userRole: UserRole,
    description: string,
    tone: DescriptionTone,
  ): Promise<{ message: string }> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.ownerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only property owner can save descriptions');
    }

    await this.prisma.property.update({
      where: { id: propertyId },
      data: {
        aiGeneratedDescription: description,
        descriptionTone: tone,
      },
    });

    this.logger.log(`Saved AI description for property ${propertyId}`);

    return { message: 'Description saved successfully' };
  }

  /**
   * Apply AI-generated description to the main description field
   */
  async applyDescription(
    propertyId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<{ message: string }> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.ownerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only property owner can apply descriptions');
    }

    if (!property.aiGeneratedDescription) {
      throw new NotFoundException('No AI-generated description found');
    }

    await this.prisma.property.update({
      where: { id: propertyId },
      data: {
        description: property.aiGeneratedDescription,
      },
    });

    this.logger.log(`Applied AI description to property ${propertyId}`);

    return { message: 'Description applied successfully' };
  }

  /**
   * Build description based on tone (PROD-029.2, PROD-029.3)
   */
  buildDescription(property: PropertyData, tone: DescriptionTone): string {
    const sections: string[] = [];

    // Opening based on tone
    sections.push(this.buildOpening(property, tone));

    // Property details section
    sections.push(this.buildDetailsSection(property, tone));

    // Features section
    sections.push(this.buildFeaturesSection(property, tone));

    // Location section
    sections.push(this.buildLocationSection(property, tone));

    // Closing based on tone
    sections.push(this.buildClosing(property, tone));

    return sections.filter(Boolean).join('\n\n');
  }

  private buildOpening(property: PropertyData, tone: DescriptionTone): string {
    const listingType = this.formatListingTypes(property.listingTypes);

    switch (tone) {
      case DescriptionTone.LUXURY:
        return `Discover unparalleled elegance in this exceptional ${listingType} at ${property.address}. This prestigious residence represents the pinnacle of refined living in ${property.city}.`;

      case DescriptionTone.FAMILY_FRIENDLY:
        return `Welcome to your family's new favorite place! This wonderful ${listingType} in ${property.city} offers everything you need to create lasting memories. Located at ${property.address}, this home is ready for your family's next chapter.`;

      case DescriptionTone.INVESTMENT_FOCUSED:
        return `Prime investment opportunity: ${listingType} at ${property.address}, ${property.city}. This property offers strong potential for appreciation and rental income in a sought-after location.`;

      case DescriptionTone.MODERN_PROFESSIONAL:
        return `Presenting a distinguished ${listingType} situated at ${property.address} in ${property.city}. This property combines contemporary design with practical functionality.`;

      case DescriptionTone.COZY_WELCOMING:
        return `Welcome home! This charming ${listingType} at ${property.address} in ${property.city} invites you to experience comfort and warmth from the moment you walk through the door.`;

      default:
        return `${listingType} available at ${property.address}, ${property.city}.`;
    }
  }

  private buildDetailsSection(property: PropertyData, tone: DescriptionTone): string {
    const details: string[] = [];

    if (property.squareMeters) {
      const sqmDescription = this.formatSquareMeters(property.squareMeters, tone);
      details.push(sqmDescription);
    }

    if (property.bedrooms !== null && property.bedrooms !== undefined) {
      const bedroomDescription = this.formatBedrooms(property.bedrooms, tone);
      details.push(bedroomDescription);
    }

    if (property.bathrooms !== null && property.bathrooms !== undefined) {
      const bathroomDescription = this.formatBathrooms(property.bathrooms, tone);
      details.push(bathroomDescription);
    }

    if (property.floors !== null && property.floors !== undefined && property.floors > 1) {
      details.push(`${property.floors} floors`);
    }

    if (property.yearBuilt) {
      const yearDescription = this.formatYearBuilt(property.yearBuilt, tone);
      details.push(yearDescription);
    }

    if (details.length === 0) return '';

    switch (tone) {
      case DescriptionTone.LUXURY:
        return `This magnificent property spans ${details.join(', ')}, offering an abundance of space for sophisticated living.`;

      case DescriptionTone.FAMILY_FRIENDLY:
        return `With ${details.join(', ')}, there's plenty of room for the whole family to spread out and enjoy.`;

      case DescriptionTone.INVESTMENT_FOCUSED:
        return `Property specifications: ${details.join(' | ')}. These metrics align with high-demand rental profiles.`;

      case DescriptionTone.MODERN_PROFESSIONAL:
        return `The property features ${details.join(', ')}, thoughtfully designed for modern living.`;

      case DescriptionTone.COZY_WELCOMING:
        return `Inside, you'll find ${details.join(', ')}, all arranged to create a comfortable and inviting atmosphere.`;

      default:
        return `Property details: ${details.join(', ')}.`;
    }
  }

  private buildFeaturesSection(property: PropertyData, tone: DescriptionTone): string {
    const features: string[] = [];

    if (property.petFriendly) {
      features.push(tone === DescriptionTone.FAMILY_FRIENDLY ? 'perfect for furry family members' : 'pet-friendly');
    }

    if (property.accessible) {
      features.push(tone === DescriptionTone.LUXURY ? 'accessibility features throughout' : 'accessible');
    }

    if (property.newlyBuilt) {
      features.push(tone === DescriptionTone.INVESTMENT_FOCUSED ? 'new construction (minimal maintenance costs)' : 'newly built');
    }

    if (property.energyEfficiency && property.energyEfficiency !== 'NOT_RATED') {
      const rating = property.energyEfficiency.replace(/_/g, ' ');
      features.push(`${rating} energy rating`);
    }

    if (property.lotSize) {
      features.push(`${property.lotSize} m² lot`);
    }

    if (features.length === 0) return '';

    switch (tone) {
      case DescriptionTone.LUXURY:
        return `Exceptional amenities include: ${features.join(', ')}.`;

      case DescriptionTone.FAMILY_FRIENDLY:
        return `Family-friendly features: ${features.join(', ')}!`;

      case DescriptionTone.INVESTMENT_FOCUSED:
        return `Value-adding features: ${features.join(', ')}.`;

      case DescriptionTone.MODERN_PROFESSIONAL:
        return `Notable features: ${features.join(', ')}.`;

      case DescriptionTone.COZY_WELCOMING:
        return `This home also offers ${features.join(', ')}.`;

      default:
        return `Features: ${features.join(', ')}.`;
    }
  }

  private buildLocationSection(property: PropertyData, tone: DescriptionTone): string {
    switch (tone) {
      case DescriptionTone.LUXURY:
        return `Situated in the prestigious area of ${property.city}, ${property.country}, this address commands attention and offers unmatched convenience to the city's finest amenities.`;

      case DescriptionTone.FAMILY_FRIENDLY:
        return `The location in ${property.city} offers great access to schools, parks, and family activities. A wonderful neighborhood to call home!`;

      case DescriptionTone.INVESTMENT_FOCUSED:
        return `Location: ${property.city}, ${property.country}. Strategic positioning with strong local market indicators and infrastructure development plans.`;

      case DescriptionTone.MODERN_PROFESSIONAL:
        return `Conveniently located in ${property.city}, ${property.country}, with easy access to transportation, dining, and business districts.`;

      case DescriptionTone.COZY_WELCOMING:
        return `Nestled in the heart of ${property.city}, you'll love exploring the friendly neighborhood and local shops.`;

      default:
        return `Located in ${property.city}, ${property.country}.`;
    }
  }

  private buildClosing(property: PropertyData, tone: DescriptionTone): string {
    const price = this.formatPrice(property.basePrice, property.currency);

    switch (tone) {
      case DescriptionTone.LUXURY:
        return `Offered at ${price}. Schedule a private viewing to experience this exceptional property firsthand.`;

      case DescriptionTone.FAMILY_FRIENDLY:
        return `Listed at ${price}. Contact us today to arrange a viewing and see why this could be your family's perfect new home!`;

      case DescriptionTone.INVESTMENT_FOCUSED:
        return `Asking price: ${price}. Contact for ROI projections and comparable market analysis.`;

      case DescriptionTone.MODERN_PROFESSIONAL:
        return `Priced at ${price}. Inquire today to arrange a viewing.`;

      case DescriptionTone.COZY_WELCOMING:
        return `Available for ${price}. We'd love to show you around – reach out to schedule a visit!`;

      default:
        return `Price: ${price}.`;
    }
  }

  private formatListingTypes(types: ListingType[]): string {
    if (!types || types.length === 0) return 'property';

    const typeNames: Record<ListingType, string> = {
      [ListingType.FOR_SALE]: 'for sale',
      [ListingType.LONG_TERM_RENT]: 'for long-term rent',
      [ListingType.SHORT_TERM_RENT]: 'for short-term rent',
      [ListingType.EVENTS]: 'for events',
      [ListingType.BARTER]: 'for exchange',
    };

    const formatted = types.map((t) => typeNames[t] || t).join(' and ');
    return `property ${formatted}`;
  }

  private formatSquareMeters(sqm: number, tone: DescriptionTone): string {
    if (tone === DescriptionTone.LUXURY) {
      return `${sqm} m² of luxurious living space`;
    }
    if (tone === DescriptionTone.INVESTMENT_FOCUSED) {
      return `${sqm} m² total area`;
    }
    return `${sqm} m²`;
  }

  private formatBedrooms(count: number, tone: DescriptionTone): string {
    if (count === 0) return 'studio layout';
    if (tone === DescriptionTone.LUXURY && count >= 4) {
      return `${count} sumptuous bedrooms`;
    }
    if (tone === DescriptionTone.FAMILY_FRIENDLY) {
      return `${count} comfortable bedroom${count > 1 ? 's' : ''}`;
    }
    return `${count} bedroom${count > 1 ? 's' : ''}`;
  }

  private formatBathrooms(count: number, tone: DescriptionTone): string {
    if (tone === DescriptionTone.LUXURY && count >= 2) {
      return `${count} elegant bathroom${count > 1 ? 's' : ''}`;
    }
    return `${count} bathroom${count > 1 ? 's' : ''}`;
  }

  private formatYearBuilt(year: number, tone: DescriptionTone): string {
    const age = new Date().getFullYear() - year;
    if (age <= 2) {
      return tone === DescriptionTone.LUXURY ? 'brand new construction' : 'newly built';
    }
    if (age <= 10) {
      return `built in ${year} (modern construction)`;
    }
    if (tone === DescriptionTone.LUXURY && age > 50) {
      return `historic ${year} construction with timeless character`;
    }
    return `built in ${year}`;
  }

  private formatPrice(price: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'EUR',
      maximumFractionDigits: 0,
    }).format(price);
  }
}
