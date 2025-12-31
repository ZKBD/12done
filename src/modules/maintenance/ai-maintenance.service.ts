import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/database';
import { MaintenanceRequestType, MaintenancePriority, ServiceType } from '@prisma/client';
import {
  AiMaintenanceAnalysisResponseDto,
  AiCategoryAnalysisDto,
  AiPriorityAnalysisDto,
  AiSuggestedSolutionDto,
  DiySolutionDto,
  AiAppointmentSuggestionsResponseDto,
  AppointmentSlotDto,
  AiRequestSuggestionsResponseDto,
} from './dto';

/**
 * AI Maintenance Service (PROD-107)
 *
 * Provides intelligent analysis for maintenance requests:
 * - Auto-categorization based on keywords (PROD-107.1)
 * - Priority scoring based on urgency indicators (PROD-107.2)
 * - DIY solutions and professional recommendations (PROD-107.3)
 * - Appointment suggestions based on provider availability (PROD-107.4)
 *
 * Note: This is a rule-based implementation that can be replaced
 * with actual AI (OpenAI, Claude, etc.) in the future.
 */
@Injectable()
export class AiMaintenanceService {
  private readonly logger = new Logger(AiMaintenanceService.name);

  // Keyword mappings for categorization (PROD-107.1)
  private readonly categoryKeywords: Record<MaintenanceRequestType, string[]> =
    {
      [MaintenanceRequestType.PLUMBING]: [
        'leak',
        'leaking',
        'faucet',
        'toilet',
        'drain',
        'pipe',
        'water',
        'clog',
        'clogged',
        'sink',
        'shower',
        'bathtub',
        'water heater',
        'garbage disposal',
        'sewage',
        'drip',
        'dripping',
        'flooding',
        'flood',
      ],
      [MaintenanceRequestType.ELECTRICAL]: [
        'electrical',
        'outlet',
        'switch',
        'light',
        'lighting',
        'power',
        'circuit',
        'breaker',
        'wiring',
        'spark',
        'sparking',
        'socket',
        'fuse',
        'voltage',
        'electric',
        'flickering',
        'blackout',
      ],
      [MaintenanceRequestType.HVAC]: [
        'heating',
        'cooling',
        'ac',
        'air conditioning',
        'hvac',
        'thermostat',
        'furnace',
        'heat',
        'cold',
        'ventilation',
        'duct',
        'filter',
        'temperature',
        'radiator',
        'boiler',
        'freezing',
        'hot',
      ],
      [MaintenanceRequestType.APPLIANCE]: [
        'appliance',
        'refrigerator',
        'fridge',
        'stove',
        'oven',
        'dishwasher',
        'washer',
        'dryer',
        'microwave',
        'freezer',
        'disposal',
        'range',
        'cooktop',
      ],
      [MaintenanceRequestType.STRUCTURAL]: [
        'wall',
        'ceiling',
        'floor',
        'roof',
        'foundation',
        'crack',
        'cracked',
        'door',
        'window',
        'stairs',
        'railing',
        'structure',
        'structural',
        'beam',
        'support',
        'sagging',
        'hole',
      ],
      [MaintenanceRequestType.PEST_CONTROL]: [
        'pest',
        'bug',
        'insect',
        'roach',
        'cockroach',
        'ant',
        'mouse',
        'mice',
        'rat',
        'rodent',
        'termite',
        'bed bug',
        'spider',
        'wasp',
        'bee',
        'infestation',
      ],
      [MaintenanceRequestType.CLEANING]: [
        'clean',
        'cleaning',
        'mold',
        'mildew',
        'stain',
        'odor',
        'smell',
        'dirty',
        'sanitation',
        'carpet',
        'deep clean',
      ],
      [MaintenanceRequestType.LANDSCAPING]: [
        'lawn',
        'garden',
        'tree',
        'bush',
        'shrub',
        'grass',
        'landscape',
        'yard',
        'fence',
        'irrigation',
        'sprinkler',
        'outdoor',
        'patio',
        'deck',
      ],
      [MaintenanceRequestType.OTHER]: [],
    };

  // Urgency indicators for priority scoring (PROD-107.2)
  private readonly urgencyIndicators = {
    emergency: [
      'emergency',
      'urgent',
      'immediately',
      'dangerous',
      'hazard',
      'fire',
      'gas leak',
      'flooding',
      'no heat',
      'no water',
      'broken into',
      'burst pipe',
      'electrical fire',
      'smoke',
      'carbon monoxide',
      'sewage backup',
    ],
    urgent: [
      'asap',
      'soon',
      'quickly',
      'safety',
      'risk',
      'water damage',
      'growing',
      'spreading',
      'worse',
      'worsening',
      'constant',
      'continuously',
      'cant use',
      "can't use",
      'not working',
      'broken',
      'pooling',
    ],
    normal: [
      'minor',
      'small',
      'occasional',
      'sometimes',
      'when possible',
      'convenience',
      'cosmetic',
      'annoying',
    ],
  };

  // DIY solutions database (PROD-107.3)
  private readonly diySolutions: Record<
    MaintenanceRequestType,
    {
      isDiyPossible: boolean;
      difficulty: number;
      estimatedMinutes: number;
      steps: DiySolutionDto[];
      tools: string[];
      whenToCallPro: string;
    }
  > = {
    [MaintenanceRequestType.PLUMBING]: {
      isDiyPossible: true,
      difficulty: 2,
      estimatedMinutes: 30,
      steps: [
        {
          step: 1,
          instruction: 'Turn off the water supply valve under the sink',
          warning: 'Make sure to have towels ready for any residual water',
        },
        {
          step: 2,
          instruction:
            'For a dripping faucet, remove the handle and replace the washer or cartridge',
        },
        {
          step: 3,
          instruction:
            'For a clogged drain, try using a plunger or drain snake before chemical cleaners',
          warning: 'Never mix different drain cleaning chemicals',
        },
        {
          step: 4,
          instruction: 'Turn water back on and check for leaks',
        },
      ],
      tools: [
        'adjustable wrench',
        'plumber tape',
        'replacement washer/cartridge',
        'plunger',
        'drain snake',
      ],
      whenToCallPro:
        'Call a professional if water is leaking behind walls, the main shutoff valve is broken, or you see signs of water damage on ceilings/floors.',
    },
    [MaintenanceRequestType.ELECTRICAL]: {
      isDiyPossible: false,
      difficulty: 5,
      estimatedMinutes: 60,
      steps: [
        {
          step: 1,
          instruction:
            'Turn off power at the circuit breaker for safety before any inspection',
          warning:
            'NEVER work on live electrical components - risk of electrocution',
        },
        {
          step: 2,
          instruction:
            'For a tripped breaker, turn it fully off then back on. If it trips again, do not reset.',
        },
        {
          step: 3,
          instruction:
            'Check if bulbs need replacement before assuming fixture is broken',
        },
      ],
      tools: ['voltage tester', 'flashlight'],
      whenToCallPro:
        'Always call a licensed electrician for any wiring work, repeatedly tripping breakers, burning smells, sparking outlets, or if you are unsure about any electrical issue.',
    },
    [MaintenanceRequestType.HVAC]: {
      isDiyPossible: true,
      difficulty: 2,
      estimatedMinutes: 20,
      steps: [
        {
          step: 1,
          instruction:
            'Check and replace the air filter if dirty (do this monthly)',
        },
        {
          step: 2,
          instruction:
            'Ensure all vents are open and unobstructed by furniture or curtains',
        },
        {
          step: 3,
          instruction:
            'Check thermostat batteries and settings - try switching between modes',
        },
        {
          step: 4,
          instruction:
            'For AC, check if the outdoor unit is clear of debris and running',
        },
      ],
      tools: ['replacement air filter', 'vacuum cleaner'],
      whenToCallPro:
        'Call HVAC professional if system is making unusual noises, not producing any heat/cool air despite filter change, or if there is ice forming on the unit.',
    },
    [MaintenanceRequestType.APPLIANCE]: {
      isDiyPossible: true,
      difficulty: 2,
      estimatedMinutes: 15,
      steps: [
        {
          step: 1,
          instruction:
            'Check if the appliance is properly plugged in and the outlet works',
        },
        {
          step: 2,
          instruction:
            'Look for any error codes on the display and search for their meaning',
        },
        {
          step: 3,
          instruction:
            'For refrigerators, clean the condenser coils and check door seals',
        },
        {
          step: 4,
          instruction:
            'Try unplugging for 1-2 minutes and plugging back in (reset)',
        },
      ],
      tools: ['screwdriver', 'vacuum with brush attachment'],
      whenToCallPro:
        'Call for repair if the appliance makes grinding/burning sounds, has visible damage, or troubleshooting steps do not resolve the issue.',
    },
    [MaintenanceRequestType.STRUCTURAL]: {
      isDiyPossible: false,
      difficulty: 4,
      estimatedMinutes: 0,
      steps: [
        {
          step: 1,
          instruction:
            'Document the issue with photos from multiple angles for the landlord',
          warning:
            'Do not attempt to repair structural issues yourself - this can void insurance or cause further damage',
        },
        {
          step: 2,
          instruction:
            'If there are cracks, monitor if they are growing by marking endpoints with tape and date',
        },
      ],
      tools: ['camera/phone', 'measuring tape', 'masking tape'],
      whenToCallPro:
        'All structural issues should be evaluated by a professional. Especially urgent if you notice rapid changes, sagging, or if doors/windows no longer close properly.',
    },
    [MaintenanceRequestType.PEST_CONTROL]: {
      isDiyPossible: true,
      difficulty: 2,
      estimatedMinutes: 30,
      steps: [
        {
          step: 1,
          instruction:
            'Identify entry points and seal gaps around doors, windows, and pipes with caulk',
        },
        {
          step: 2,
          instruction:
            'Remove food sources - store food in sealed containers, clean up crumbs immediately',
        },
        {
          step: 3,
          instruction: 'Set traps appropriate for the pest type (not poison)',
          warning:
            'Avoid poison if you have pets or small children in the home',
        },
        {
          step: 4,
          instruction:
            'Keep areas dry - fix any leaks as many pests are attracted to moisture',
        },
      ],
      tools: ['caulk', 'traps', 'sealed containers'],
      whenToCallPro:
        'Call pest control for infestations, bed bugs, termites, or any venomous insects/rodents. DIY is only for prevention and minor issues.',
    },
    [MaintenanceRequestType.CLEANING]: {
      isDiyPossible: true,
      difficulty: 1,
      estimatedMinutes: 60,
      steps: [
        {
          step: 1,
          instruction:
            'For mold, use a solution of 1 cup bleach to 1 gallon water',
          warning:
            'Wear gloves and ensure good ventilation. Never mix bleach with ammonia.',
        },
        {
          step: 2,
          instruction:
            'For carpet stains, blot (do not rub) and use appropriate cleaner for stain type',
        },
        {
          step: 3,
          instruction:
            'For odors, identify and eliminate the source before using air fresheners',
        },
      ],
      tools: [
        'bleach solution',
        'spray bottle',
        'scrub brush',
        'gloves',
        'mask',
      ],
      whenToCallPro:
        'Call professionals for mold covering more than 10 sq ft, black mold, mold in HVAC systems, or persistent odors from unknown sources.',
    },
    [MaintenanceRequestType.LANDSCAPING]: {
      isDiyPossible: true,
      difficulty: 2,
      estimatedMinutes: 60,
      steps: [
        {
          step: 1,
          instruction: 'Check lease agreement for tenant lawn care responsibilities',
        },
        {
          step: 2,
          instruction:
            'For minor issues, regular watering and mowing can address many lawn problems',
        },
        {
          step: 3,
          instruction:
            'For irrigation issues, check for visible leaks or broken sprinkler heads',
        },
      ],
      tools: ['lawn mower', 'garden hose', 'basic gardening tools'],
      whenToCallPro:
        'Contact landlord for tree removal, major irrigation repairs, fence repairs, or any work that requires permits.',
    },
    [MaintenanceRequestType.OTHER]: {
      isDiyPossible: false,
      difficulty: 3,
      estimatedMinutes: 0,
      steps: [
        {
          step: 1,
          instruction:
            'Document the issue thoroughly with photos and detailed description',
        },
        {
          step: 2,
          instruction:
            'Contact your landlord or property manager to discuss the specific issue',
        },
      ],
      tools: ['camera/phone'],
      whenToCallPro:
        'For any issue that does not fit standard categories, consult with your landlord or property manager to determine appropriate next steps.',
    },
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Analyze a maintenance request and provide AI-powered suggestions
   * Implements PROD-107.1, PROD-107.2, PROD-107.3
   */
  async analyzeRequest(
    title: string,
    description: string,
  ): Promise<AiMaintenanceAnalysisResponseDto> {
    const text = `${title} ${description}`.toLowerCase();

    const category = this.analyzeCategory(text);
    const priority = this.analyzePriority(text, category.suggestedType);
    const solutions = this.getSolutions(category.suggestedType);

    return {
      category,
      priority,
      solutions,
      analyzedAt: new Date(),
      modelVersion: 'rule-based-v1',
    };
  }

  /**
   * Get AI suggestions for an existing maintenance request
   * Implements PROD-107.1, PROD-107.2, PROD-107.3, PROD-107.4
   */
  async getRequestSuggestions(
    requestId: string,
  ): Promise<AiRequestSuggestionsResponseDto> {
    const request = await this.prisma.maintenanceRequest.findUnique({
      where: { id: requestId },
      include: { property: true },
    });

    if (!request) {
      throw new Error('Maintenance request not found');
    }

    const text = `${request.title} ${request.description}`.toLowerCase();
    const category = this.analyzeCategory(text);
    const priority = this.analyzePriority(text, category.suggestedType);
    const solutions = this.getSolutions(category.suggestedType);

    let appointments: AiAppointmentSuggestionsResponseDto | undefined;
    if (request.propertyId) {
      appointments = await this.suggestAppointments(
        request.propertyId,
        request.type,
      );
    }

    return {
      requestId,
      category,
      priority,
      solutions,
      appointments,
      generatedAt: new Date(),
    };
  }

  /**
   * Suggest optimal appointment slots based on provider availability
   * Implements PROD-107.4
   */
  async suggestAppointments(
    propertyId: string,
    requestType: MaintenanceRequestType,
  ): Promise<AiAppointmentSuggestionsResponseDto> {
    // Get property location for finding nearby providers
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { city: true, country: true },
    });

    if (!property) {
      return this.getDefaultAppointmentSuggestions();
    }

    // Map maintenance type to service provider types
    const serviceTypes = this.mapTypeToServiceTypes(requestType);

    // Find approved providers (service area filtering done in memory due to JSON field)
    const providers = await this.prisma.serviceProvider.findMany({
      where: {
        status: 'APPROVED',
        serviceType: { in: serviceTypes },
      },
      include: {
        availability: {
          where: {
            isAvailable: true,
          },
          orderBy: { dayOfWeek: 'asc' },
        },
        reviews: {
          select: { rating: true },
        },
      },
      take: 20,
    });

    // Filter by service area (city match in JSON field)
    const filteredProviders = providers.filter((provider) => {
      if (!provider.serviceArea) return true; // Accept if no area restriction
      const area = provider.serviceArea as { city?: string };
      return !area.city || area.city.toLowerCase() === property.city?.toLowerCase();
    });

    if (filteredProviders.length === 0) {
      return this.getDefaultAppointmentSuggestions();
    }

    // Generate suggested slots based on provider weekly availability
    const slots = this.generateAppointmentSlotsFromWeekly(filteredProviders);

    // If no slots available (providers have no availability set), fall back to defaults
    if (slots.length === 0) {
      return this.getDefaultAppointmentSuggestions();
    }

    // Calculate average wait and recommendation
    const avgWait = this.calculateAverageWait(slots);

    return {
      suggestedSlots: slots.slice(0, 5), // Top 5 suggestions
      totalAvailableProviders: filteredProviders.length,
      averageWaitDays: avgWait,
      recommendation: this.generateAppointmentRecommendation(
        slots,
        filteredProviders.length,
      ),
      generatedAt: new Date(),
    };
  }

  /**
   * Analyze and categorize the maintenance request (PROD-107.1)
   */
  private analyzeCategory(text: string): AiCategoryAnalysisDto {
    const scores: Record<MaintenanceRequestType, number> = {} as Record<
      MaintenanceRequestType,
      number
    >;
    const matchedKeywords: string[] = [];

    for (const [type, keywords] of Object.entries(this.categoryKeywords)) {
      scores[type as MaintenanceRequestType] = 0;
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          scores[type as MaintenanceRequestType]++;
          if (!matchedKeywords.includes(keyword)) {
            matchedKeywords.push(keyword);
          }
        }
      }
    }

    // Find the type with highest score
    let maxScore = 0;
    let suggestedType: MaintenanceRequestType = MaintenanceRequestType.OTHER;

    for (const [type, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        suggestedType = type as MaintenanceRequestType;
      }
    }

    // Calculate confidence based on match count and uniqueness
    const totalKeywords =
      this.categoryKeywords[suggestedType]?.length || 1;
    const confidence = Math.min(maxScore / Math.min(totalKeywords, 5), 1);

    return {
      suggestedType,
      typeConfidence: Math.round(confidence * 100) / 100,
      matchedKeywords: matchedKeywords.slice(0, 5),
    };
  }

  /**
   * Analyze and score priority (PROD-107.2)
   */
  private analyzePriority(
    text: string,
    type: MaintenanceRequestType,
  ): AiPriorityAnalysisDto {
    const urgencyFactors: string[] = [];
    let priorityScore = 0;

    // Check for emergency indicators
    for (const keyword of this.urgencyIndicators.emergency) {
      if (text.includes(keyword)) {
        priorityScore += 3;
        urgencyFactors.push(keyword);
      }
    }

    // Check for urgent indicators
    for (const keyword of this.urgencyIndicators.urgent) {
      if (text.includes(keyword)) {
        priorityScore += 2;
        urgencyFactors.push(keyword);
      }
    }

    // Check for normal/low indicators (reduces priority)
    for (const keyword of this.urgencyIndicators.normal) {
      if (text.includes(keyword)) {
        priorityScore -= 1;
      }
    }

    // Type-based priority adjustments
    if (
      type === MaintenanceRequestType.ELECTRICAL ||
      type === MaintenanceRequestType.STRUCTURAL
    ) {
      priorityScore += 1; // Safety-related types get a boost
      urgencyFactors.push('safety-related type');
    }

    // Determine priority level
    let suggestedPriority: MaintenancePriority;
    if (priorityScore >= 5) {
      suggestedPriority = MaintenancePriority.EMERGENCY;
    } else if (priorityScore >= 3) {
      suggestedPriority = MaintenancePriority.URGENT;
    } else if (priorityScore >= 1) {
      suggestedPriority = MaintenancePriority.NORMAL;
    } else {
      suggestedPriority = MaintenancePriority.LOW;
    }

    // Calculate confidence
    const confidence = Math.min(
      0.5 + urgencyFactors.length * 0.1,
      0.95,
    );

    return {
      suggestedPriority,
      priorityConfidence: Math.round(confidence * 100) / 100,
      urgencyFactors: urgencyFactors.slice(0, 5),
      explanation: this.generatePriorityExplanation(
        suggestedPriority,
        urgencyFactors,
        type,
      ),
    };
  }

  /**
   * Get DIY solutions for a maintenance type (PROD-107.3)
   */
  private getSolutions(type: MaintenanceRequestType): AiSuggestedSolutionDto {
    const solution = this.diySolutions[type] || this.diySolutions[MaintenanceRequestType.OTHER];

    return {
      isDiyPossible: solution.isDiyPossible,
      diyDifficulty: solution.difficulty,
      estimatedTimeMinutes: solution.estimatedMinutes,
      diySteps: solution.isDiyPossible ? solution.steps : undefined,
      toolsNeeded: solution.isDiyPossible ? solution.tools : undefined,
      whenToCallProfessional: solution.whenToCallPro,
    };
  }

  /**
   * Generate explanation for priority assessment
   */
  private generatePriorityExplanation(
    priority: MaintenancePriority,
    factors: string[],
    type: MaintenanceRequestType,
  ): string {
    const typeLabel = type.toLowerCase().replace('_', ' ');

    if (priority === MaintenancePriority.EMERGENCY) {
      return `This ${typeLabel} issue requires immediate attention due to: ${factors.slice(0, 3).join(', ')}. Contact emergency services if there is immediate danger.`;
    } else if (priority === MaintenancePriority.URGENT) {
      return `This ${typeLabel} issue should be addressed as soon as possible to prevent further damage or safety risks.`;
    } else if (priority === MaintenancePriority.NORMAL) {
      return `This ${typeLabel} issue should be scheduled for repair within the next few days.`;
    } else {
      return `This ${typeLabel} issue is low priority and can be addressed at the landlord's convenience.`;
    }
  }

  /**
   * Map maintenance type to service provider types
   * Note: ServiceType enum is limited (LAWYER, CLEANER, HANDYMAN, PROPERTY_SHOWING, RECEPTIONIST)
   * Most maintenance types map to HANDYMAN or CLEANER
   */
  private mapTypeToServiceTypes(type: MaintenanceRequestType): ServiceType[] {
    const mapping: Record<MaintenanceRequestType, ServiceType[]> = {
      [MaintenanceRequestType.PLUMBING]: [ServiceType.HANDYMAN],
      [MaintenanceRequestType.ELECTRICAL]: [ServiceType.HANDYMAN],
      [MaintenanceRequestType.HVAC]: [ServiceType.HANDYMAN],
      [MaintenanceRequestType.APPLIANCE]: [ServiceType.HANDYMAN],
      [MaintenanceRequestType.STRUCTURAL]: [ServiceType.HANDYMAN],
      [MaintenanceRequestType.PEST_CONTROL]: [ServiceType.HANDYMAN],
      [MaintenanceRequestType.CLEANING]: [ServiceType.CLEANER],
      [MaintenanceRequestType.LANDSCAPING]: [ServiceType.HANDYMAN],
      [MaintenanceRequestType.OTHER]: [ServiceType.HANDYMAN],
    };

    return mapping[type] || [ServiceType.HANDYMAN];
  }

  /**
   * Generate appointment slots from provider weekly availability
   * Creates specific date slots for the next 2 weeks based on weekly schedules
   */
  private generateAppointmentSlotsFromWeekly(providers: any[]): AppointmentSlotDto[] {
    const slotsMap = new Map<string, AppointmentSlotDto>();
    const today = new Date();

    // Generate slots for the next 14 days
    for (let dayOffset = 1; dayOffset <= 14; dayOffset++) {
      const date = new Date(today);
      date.setDate(date.getDate() + dayOffset);
      const dayOfWeek = date.getDay(); // 0-6 (Sunday-Saturday)
      const dateStr = date.toISOString().split('T')[0];

      for (const provider of providers) {
        const avgRating =
          provider.reviews.length > 0
            ? provider.reviews.reduce((sum: number, r: any) => sum + r.rating, 0) /
              provider.reviews.length
            : undefined;

        // Find availability for this day of week
        const dayAvailability = provider.availability.find(
          (a: any) => a.dayOfWeek === dayOfWeek && a.isAvailable,
        );

        if (!dayAvailability) continue;

        const timeSlot = `${dayAvailability.startTime}-${dayAvailability.endTime}`;
        const key = `${dateStr}-${timeSlot}`;

        if (!slotsMap.has(key)) {
          slotsMap.set(key, {
            date: dateStr,
            timeSlot,
            availabilityScore: 0,
            reason: '',
            availableProviders: [],
          });
        }

        const slot = slotsMap.get(key)!;
        slot.availableProviders!.push({
          providerId: provider.id,
          providerName: provider.user?.name || 'Service Provider',
          rating: avgRating,
          reviewCount: provider.reviews.length,
        });

        // Score increases with more providers, higher ratings, and earlier dates
        const dateBonus = Math.max(0, (14 - dayOffset) / 14) * 0.2;
        slot.availabilityScore = Math.min(
          slot.availableProviders!.length * 0.2 + (avgRating || 3) * 0.1 + dateBonus,
          1,
        );
      }
    }

    // Convert to array and sort by score
    const slots = Array.from(slotsMap.values());
    slots.sort((a, b) => b.availabilityScore - a.availabilityScore);

    // Add reasons
    for (const slot of slots) {
      const providerCount = slot.availableProviders!.length;
      const topRated = slot.availableProviders!.some(
        (p) => p.rating && p.rating >= 4.5,
      );

      if (providerCount >= 3 && topRated) {
        slot.reason = 'Highly recommended - multiple top-rated providers available';
      } else if (providerCount >= 2) {
        slot.reason = 'Good availability with multiple providers';
      } else if (topRated) {
        slot.reason = 'Top-rated provider available';
      } else {
        slot.reason = 'Provider available';
      }
    }

    return slots;
  }

  /**
   * Calculate average wait time
   */
  private calculateAverageWait(slots: AppointmentSlotDto[]): number {
    if (slots.length === 0) return 7; // Default 1 week

    const today = new Date();
    let totalDays = 0;

    for (const slot of slots.slice(0, 5)) {
      const slotDate = new Date(slot.date);
      const diffTime = Math.abs(slotDate.getTime() - today.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      totalDays += diffDays;
    }

    return Math.round(totalDays / Math.min(slots.length, 5));
  }

  /**
   * Generate appointment recommendation text
   */
  private generateAppointmentRecommendation(
    slots: AppointmentSlotDto[],
    providerCount: number,
  ): string {
    if (slots.length === 0) {
      return 'No providers are currently available. Please check back later or contact your landlord.';
    }

    const topSlot = slots[0];
    const dayName = new Date(topSlot.date).toLocaleDateString('en-US', {
      weekday: 'long',
    });

    if (topSlot.availabilityScore >= 0.8) {
      return `We recommend scheduling for ${dayName} ${topSlot.timeSlot} when ${topSlot.availableProviders!.length} qualified providers are available.`;
    } else {
      return `${providerCount} providers are available. The earliest slot is ${dayName} ${topSlot.timeSlot}.`;
    }
  }

  /**
   * Get default suggestions when no providers available
   */
  private getDefaultAppointmentSuggestions(): AiAppointmentSuggestionsResponseDto {
    const today = new Date();
    const slots: AppointmentSlotDto[] = [];

    // Generate next 5 weekday slots
    for (let i = 1; i <= 7 && slots.length < 5; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);

      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      slots.push({
        date: date.toISOString().split('T')[0],
        timeSlot: '09:00-12:00',
        availabilityScore: 0.5,
        reason: 'Standard scheduling - provider availability pending',
        availableProviders: [],
      });
    }

    return {
      suggestedSlots: slots,
      totalAvailableProviders: 0,
      averageWaitDays: 3,
      recommendation:
        'No providers are currently in our system for this area. Your landlord will help find an appropriate service provider.',
      generatedAt: new Date(),
    };
  }
}
