import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { VoiceStyle, InterestCategory, PoiType } from '@prisma/client';
import { PoiService } from './poi.service';
import { NarrationRequestDto, NarrationResponseDto, PoiResponseDto } from './dto';

// Narration templates by voice style (PROD-127)
interface NarrationTemplate {
  greeting: string;
  transition: string;
  factIntro: string;
  historyIntro: string;
  tipIntro: string;
  closing: string;
}

const VOICE_TEMPLATES: Record<VoiceStyle, NarrationTemplate> = {
  [VoiceStyle.HISTORICAL]: {
    greeting: 'We now arrive at {name}, a place of considerable historical significance.',
    transition: 'As we observe this location, one cannot help but appreciate',
    factIntro: 'It is documented that',
    historyIntro: 'Historical records indicate that',
    tipIntro: 'Visitors are advised to',
    closing:
      'This concludes our examination of {name}. We shall proceed to our next destination.',
  },
  [VoiceStyle.FRIENDLY]: {
    greeting: "Hey, welcome to {name}! This is such a cool spot.",
    transition: "Let me tell you what makes this place so special -",
    factIntro: 'Here\'s something interesting:',
    historyIntro: 'So, the story goes that',
    tipIntro: "Pro tip:",
    closing: "That's {name} for you! Ready to check out the next stop?",
  },
  [VoiceStyle.PROFESSIONAL]: {
    greeting: 'Welcome to {name}. This location is a notable point of interest.',
    transition: 'Key features of this site include',
    factIntro: 'Important information:',
    historyIntro: 'Background:',
    tipIntro: 'Recommendation:',
    closing: 'This completes our overview of {name}. Proceed when ready.',
  },
};

// POI type-specific content templates
const POI_CONTENT: Record<PoiType, { facts: string[]; tips: string[] }> = {
  [PoiType.RESTAURANT]: {
    facts: [
      'This establishment is known for its {cuisine} cuisine.',
      'The venue offers a {atmosphere} dining experience.',
      'Popular dishes include seasonal specialties.',
    ],
    tips: [
      'Reservations are recommended for dinner service.',
      'Try the daily specials for the freshest options.',
      'Ask about local wine pairings.',
    ],
  },
  [PoiType.MUSEUM]: {
    facts: [
      'The collection features {count} notable exhibits.',
      'This institution was established to preserve cultural heritage.',
      'The architecture itself is considered a work of art.',
    ],
    tips: [
      'Audio guides are available in multiple languages.',
      'Plan at least {time} hours for a thorough visit.',
      'Photography may be restricted in certain galleries.',
    ],
  },
  [PoiType.PARK]: {
    facts: [
      'This green space covers {area} and provides a natural retreat.',
      'The park is home to diverse flora and fauna.',
      'This area has been a public gathering space for generations.',
    ],
    tips: [
      'Early morning visits offer the best bird watching opportunities.',
      'Picnic areas are available near the main paths.',
      'Walking paths are well-maintained year-round.',
    ],
  },
  [PoiType.LANDMARK]: {
    facts: [
      'This landmark has stood for {years} years.',
      'The structure represents {style} architectural style.',
      'It has witnessed significant historical events.',
    ],
    tips: [
      'The best photos can be taken from the eastern viewpoint.',
      'Guided tours provide deeper historical context.',
      'Visit during golden hour for spectacular lighting.',
    ],
  },
  [PoiType.SHOP]: {
    facts: [
      'This shopping destination features local and international brands.',
      'The area is known for its unique retail offerings.',
      'Artisan goods and specialty items can be found here.',
    ],
    tips: [
      'Look for seasonal sales and promotions.',
      'Local craftspeople often demonstrate their skills.',
      'Bargaining may be acceptable at market stalls.',
    ],
  },
  [PoiType.BUILDING]: {
    facts: [
      'This building showcases distinctive architectural features.',
      'The structure serves as a civic landmark.',
      'Design elements reflect the era of its construction.',
    ],
    tips: [
      'Observe the facade details from across the street.',
      'Interior tours may be available during certain hours.',
      'The surrounding area offers additional points of interest.',
    ],
  },
  [PoiType.HOTEL]: {
    facts: [
      'This establishment has been welcoming guests for years.',
      'The property features notable amenities and services.',
      'The location offers convenient access to attractions.',
    ],
    tips: [
      'The lobby and public areas are often worth viewing.',
      'Restaurants and bars may be open to non-guests.',
      'Historical properties often offer heritage tours.',
    ],
  },
  [PoiType.TRANSPORT]: {
    facts: [
      'This transport hub serves thousands of travelers daily.',
      'The station architecture reflects its era of construction.',
      'Multiple transportation options connect from here.',
    ],
    tips: [
      'Check schedules and platform information displays.',
      'Allow extra time during peak travel periods.',
      'Ticket offices and machines are available for assistance.',
    ],
  },
  [PoiType.ENTERTAINMENT]: {
    facts: [
      'This venue has hosted countless performances and events.',
      'The facility features modern amenities for visitors.',
      'Entertainment options cater to diverse interests.',
    ],
    tips: [
      'Check the schedule for current performances.',
      'Advance booking is recommended for popular shows.',
      'Arrive early to explore the facility.',
    ],
  },
  [PoiType.HEALTHCARE]: {
    facts: [
      'This facility provides essential healthcare services.',
      'Medical staff maintain high standards of care.',
      'The institution serves the local community.',
    ],
    tips: [
      'Emergency services are available around the clock.',
      'Appointments can be made in advance.',
      'Interpreter services may be available.',
    ],
  },
  [PoiType.EDUCATION]: {
    facts: [
      'This institution has a tradition of academic excellence.',
      'The campus features notable architectural elements.',
      'Research and learning activities continue here.',
    ],
    tips: [
      'Campus tours may be available for visitors.',
      'Public lectures and events are often open to all.',
      'Libraries and museums on campus may welcome visitors.',
    ],
  },
  [PoiType.OTHER]: {
    facts: [
      'This location is a notable point of interest.',
      'The site offers unique experiences for visitors.',
      'Local significance makes this worth a visit.',
    ],
    tips: [
      'Ask locals for insider recommendations.',
      'Take time to explore the surrounding area.',
      'Photos are usually welcome at this location.',
    ],
  },
};

// Interest-specific additional content (PROD-133)
const INTEREST_CONTENT: Record<InterestCategory, string[]> = {
  [InterestCategory.HISTORY]: [
    'Historical records from this site date back centuries.',
    'This location played a role in significant historical events.',
    'Artifacts and documents preserve the rich history here.',
  ],
  [InterestCategory.FOOD]: [
    'The culinary traditions here reflect local ingredients and techniques.',
    'Food enthusiasts appreciate the authentic flavors offered.',
    'Local specialties have been perfected over generations.',
  ],
  [InterestCategory.ARCHITECTURE]: [
    'The architectural style demonstrates careful craftsmanship.',
    'Design elements incorporate both form and function.',
    'Structural features represent the building traditions of the era.',
  ],
  [InterestCategory.NATURE]: [
    'Natural beauty surrounds this location.',
    'Flora and fauna thrive in this environment.',
    'The ecosystem here supports diverse wildlife.',
  ],
  [InterestCategory.SHOPPING]: [
    'Retail opportunities range from local crafts to international brands.',
    'Unique finds await shoppers who explore thoroughly.',
    'Local artisans offer handcrafted goods.',
  ],
  [InterestCategory.NIGHTLIFE]: [
    'Evening activities bring energy to this area.',
    'Entertainment options extend into the night hours.',
    'The atmosphere transforms as the sun sets.',
  ],
  [InterestCategory.CULTURE]: [
    'Cultural traditions are preserved and celebrated here.',
    'Local customs offer insight into the community.',
    'Art and expression flourish in this environment.',
  ],
  [InterestCategory.SPORTS]: [
    'Athletic activities and sports are popular here.',
    'Facilities cater to active visitors.',
    'Local teams and athletes represent the community.',
  ],
  [InterestCategory.FAMILY]: [
    'Family-friendly activities are available.',
    'Children and adults alike find enjoyment here.',
    'Accessibility makes this suitable for all ages.',
  ],
  [InterestCategory.ART]: [
    'Artistic expression takes many forms here.',
    'Creative works inspire and provoke thought.',
    'Artists have long found inspiration in this location.',
  ],
};

// Average speaking rate: ~150 words per minute
const WORDS_PER_SECOND = 2.5;

@Injectable()
export class NarrationService {
  private readonly logger = new Logger(NarrationService.name);

  constructor(private readonly poiService: PoiService) {}

  /**
   * Generate narration for a POI (PROD-123, PROD-127, PROD-133)
   */
  async generateNarration(request: NarrationRequestDto): Promise<NarrationResponseDto> {
    const { placeId, voiceStyle = VoiceStyle.FRIENDLY, language = 'en', interests } = request;

    // Get POI details
    const poi = await this.poiService.getPoiDetails({ placeId, language });

    if (!poi) {
      throw new NotFoundException(`POI not found: ${placeId}`);
    }

    // Generate narration text
    const narrationText = this.buildNarration(poi, voiceStyle, interests);

    // Calculate estimated speaking duration
    const wordCount = narrationText.split(/\s+/).length;
    const estimatedDuration = Math.ceil(wordCount / WORDS_PER_SECOND);

    return {
      placeId: poi.placeId,
      placeName: poi.name,
      narration: narrationText,
      voiceStyle,
      language,
      interests,
      estimatedDuration,
    };
  }

  /**
   * Build narration text based on POI, voice style, and interests
   */
  buildNarration(
    poi: PoiResponseDto,
    voiceStyle: VoiceStyle,
    interests?: InterestCategory[],
  ): string {
    const template = VOICE_TEMPLATES[voiceStyle];
    const content = POI_CONTENT[poi.type] || POI_CONTENT[PoiType.OTHER];

    const parts: string[] = [];

    // Greeting
    parts.push(template.greeting.replace('{name}', poi.name));

    // Rating info (if available)
    if (poi.rating) {
      const ratingText = this.formatRating(poi.rating, poi.reviewCount, voiceStyle);
      parts.push(ratingText);
    }

    // Main facts
    parts.push(template.transition);
    const randomFact = content.facts[Math.floor(Math.random() * content.facts.length)];
    parts.push(
      this.fillPlaceholders(randomFact, poi),
    );

    // Interest-specific content
    if (interests && interests.length > 0) {
      for (const interest of interests.slice(0, 2)) {
        const interestContent = INTEREST_CONTENT[interest];
        if (interestContent) {
          const randomInterestFact =
            interestContent[Math.floor(Math.random() * interestContent.length)];
          parts.push(`${template.factIntro} ${randomInterestFact}`);
        }
      }
    }

    // Opening hours (if available)
    if (poi.isOpen !== undefined) {
      const openStatus = poi.isOpen
        ? voiceStyle === VoiceStyle.FRIENDLY
          ? "Good news - it's open right now!"
          : 'The establishment is currently open.'
        : voiceStyle === VoiceStyle.FRIENDLY
          ? 'Heads up - this place is currently closed.'
          : 'Please note that this location is currently closed.';
      parts.push(openStatus);
    }

    // Tip
    const randomTip = content.tips[Math.floor(Math.random() * content.tips.length)];
    parts.push(`${template.tipIntro} ${this.fillPlaceholders(randomTip, poi)}`);

    // Closing
    parts.push(template.closing.replace('{name}', poi.name));

    return parts.join(' ');
  }

  /**
   * Format rating information based on voice style
   */
  private formatRating(rating: number, reviewCount?: number, voiceStyle?: VoiceStyle): string {
    const reviewText = reviewCount ? ` based on ${reviewCount.toLocaleString()} reviews` : '';

    switch (voiceStyle) {
      case VoiceStyle.HISTORICAL:
        return `This establishment holds a rating of ${rating.toFixed(1)} out of 5${reviewText}.`;
      case VoiceStyle.FRIENDLY:
        if (rating >= 4.5) return `People really love this place - it has an amazing ${rating.toFixed(1)} star rating${reviewText}!`;
        if (rating >= 4.0) return `This spot has a solid ${rating.toFixed(1)} stars${reviewText}.`;
        return `It has a ${rating.toFixed(1)} star rating${reviewText}.`;
      case VoiceStyle.PROFESSIONAL:
      default:
        return `Current rating: ${rating.toFixed(1)}/5${reviewText}.`;
    }
  }

  /**
   * Fill in template placeholders with actual values
   */
  private fillPlaceholders(template: string, poi: PoiResponseDto): string {
    return template
      .replace('{cuisine}', this.guessCuisine(poi))
      .replace('{atmosphere}', this.guessAtmosphere(poi))
      .replace('{count}', String(Math.floor(Math.random() * 50) + 10))
      .replace('{time}', String(Math.floor(Math.random() * 2) + 1))
      .replace('{area}', 'several hectares')
      .replace('{years}', String(Math.floor(Math.random() * 200) + 50))
      .replace('{style}', this.guessStyle(poi));
  }

  /**
   * Guess cuisine type based on POI name (simplified)
   */
  private guessCuisine(poi: PoiResponseDto): string {
    const name = poi.name.toLowerCase();
    if (name.includes('italian') || name.includes('pizza') || name.includes('pasta'))
      return 'Italian';
    if (name.includes('sushi') || name.includes('japanese') || name.includes('ramen'))
      return 'Japanese';
    if (name.includes('chinese') || name.includes('dim sum')) return 'Chinese';
    if (name.includes('mexican') || name.includes('taco')) return 'Mexican';
    if (name.includes('french') || name.includes('bistro')) return 'French';
    if (name.includes('indian') || name.includes('curry')) return 'Indian';
    return 'local';
  }

  /**
   * Guess atmosphere based on price level
   */
  private guessAtmosphere(poi: PoiResponseDto): string {
    if (!poi.priceLevel) return 'welcoming';
    if (poi.priceLevel >= 3) return 'upscale';
    if (poi.priceLevel === 2) return 'comfortable';
    return 'casual';
  }

  /**
   * Guess architectural style (simplified)
   */
  private guessStyle(_poi: PoiResponseDto): string {
    const styles = [
      'classical',
      'baroque',
      'neo-gothic',
      'art deco',
      'modern',
      'contemporary',
      'traditional',
    ];
    return styles[Math.floor(Math.random() * styles.length)];
  }

  /**
   * Generate navigation instruction narration (PROD-124)
   */
  generateNavigationNarration(
    instruction: string,
    distance: number,
    voiceStyle: VoiceStyle = VoiceStyle.FRIENDLY,
  ): string {
    const distanceText =
      distance >= 1000
        ? `${(distance / 1000).toFixed(1)} kilometers`
        : `${distance} meters`;

    switch (voiceStyle) {
      case VoiceStyle.HISTORICAL:
        return `Proceed ${distanceText} as follows: ${instruction}.`;
      case VoiceStyle.FRIENDLY:
        return `Okay, ${instruction.toLowerCase()} for about ${distanceText}.`;
      case VoiceStyle.PROFESSIONAL:
      default:
        return `${instruction}. Distance: ${distanceText}.`;
    }
  }

  /**
   * Generate arrival narration (PROD-124.4)
   */
  generateArrivalNarration(placeName: string, voiceStyle: VoiceStyle = VoiceStyle.FRIENDLY): string {
    switch (voiceStyle) {
      case VoiceStyle.HISTORICAL:
        return `We have arrived at ${placeName}. Please observe your surroundings.`;
      case VoiceStyle.FRIENDLY:
        return `We're here! Welcome to ${placeName}!`;
      case VoiceStyle.PROFESSIONAL:
      default:
        return `Destination reached: ${placeName}.`;
    }
  }
}
