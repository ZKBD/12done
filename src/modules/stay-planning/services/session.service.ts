import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  CreateSessionDto,
  UpdateWizardStepDto,
  SelectProposalDto,
  SessionResponseDto,
  ProposalResponseDto,
} from '../dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new stay planning session
   */
  async createSession(
    userId: string,
    dto: CreateSessionDto,
  ): Promise<SessionResponseDto> {
    // Verify property exists if provided
    if (dto.propertyId) {
      const property = await this.prisma.property.findUnique({
        where: { id: dto.propertyId },
      });
      if (!property) {
        throw new NotFoundException('Property not found');
      }
    }

    const session = await this.prisma.stayPlanningSession.create({
      data: {
        userId,
        propertyId: dto.propertyId,
      },
    });

    return this.mapToResponse(session);
  }

  /**
   * Get session by ID
   */
  async getSession(
    userId: string,
    sessionId: string,
  ): Promise<SessionResponseDto> {
    const session = await this.prisma.stayPlanningSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
      include: {
        tripPlan: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return this.mapToResponse(session);
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(
    userId: string,
    options?: { completed?: boolean; propertyId?: string },
  ): Promise<SessionResponseDto[]> {
    const where: Prisma.StayPlanningSessionWhereInput = { userId };

    if (options?.completed !== undefined) {
      where.isCompleted = options.completed;
    }
    if (options?.propertyId) {
      where.propertyId = options.propertyId;
    }

    const sessions = await this.prisma.stayPlanningSession.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return sessions.map((s) => this.mapToResponse(s));
  }

  /**
   * Update wizard step with answers
   */
  async updateWizardStep(
    userId: string,
    sessionId: string,
    dto: UpdateWizardStepDto,
  ): Promise<SessionResponseDto> {
    const session = await this.prisma.stayPlanningSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.isCompleted) {
      throw new BadRequestException('Session is already completed');
    }

    // Validate date range
    if (dto.startDate && dto.endDate) {
      const start = new Date(dto.startDate);
      const end = new Date(dto.endDate);
      if (end <= start) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    // Validate budget range
    if (dto.budgetMin !== undefined && dto.budgetMax !== undefined) {
      if (dto.budgetMax < dto.budgetMin) {
        throw new BadRequestException(
          'Maximum budget must be greater than minimum',
        );
      }
    }

    const updated = await this.prisma.stayPlanningSession.update({
      where: { id: sessionId },
      data: {
        season: dto.season,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        budgetMin: dto.budgetMin,
        budgetMax: dto.budgetMax,
        currency: dto.currency,
        interests: dto.interests,
        numberOfGuests: dto.numberOfGuests,
        hasChildren: dto.hasChildren,
        childrenAges: dto.childrenAges,
        mobilityNeeds: dto.mobilityNeeds,
        preferredPace: dto.preferredPace,
        currentStep: dto.currentStep,
      },
    });

    return this.mapToResponse(updated);
  }

  /**
   * Generate AI proposals based on session preferences
   */
  async generateProposals(
    userId: string,
    sessionId: string,
  ): Promise<ProposalResponseDto[]> {
    const session = await this.prisma.stayPlanningSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        property: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Validate required fields for proposal generation
    if (!session.startDate || !session.endDate) {
      throw new BadRequestException('Start and end dates are required');
    }

    // Calculate trip duration
    const days = Math.ceil(
      (session.endDate.getTime() - session.startDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    // Generate proposals based on preferences
    const proposals = this.generateProposalSuggestions(session, days);

    // Store proposals in session
    await this.prisma.stayPlanningSession.update({
      where: { id: sessionId },
      data: {
        proposals: proposals as unknown as Prisma.JsonValue,
      },
    });

    return proposals;
  }

  /**
   * Select a proposal to create trip plan
   */
  async selectProposal(
    userId: string,
    sessionId: string,
    dto: SelectProposalDto,
  ): Promise<SessionResponseDto> {
    const session = await this.prisma.stayPlanningSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const proposals = session.proposals as unknown as ProposalResponseDto[];
    if (!proposals || !proposals[dto.proposalIndex]) {
      throw new BadRequestException('Invalid proposal index');
    }

    const updated = await this.prisma.stayPlanningSession.update({
      where: { id: sessionId },
      data: {
        selectedProposalIndex: dto.proposalIndex,
      },
    });

    return this.mapToResponse(updated);
  }

  /**
   * Complete the session
   */
  async completeSession(
    userId: string,
    sessionId: string,
  ): Promise<SessionResponseDto> {
    const session = await this.prisma.stayPlanningSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const updated = await this.prisma.stayPlanningSession.update({
      where: { id: sessionId },
      data: {
        isCompleted: true,
      },
    });

    return this.mapToResponse(updated);
  }

  /**
   * Delete a session
   */
  async deleteSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.prisma.stayPlanningSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    await this.prisma.stayPlanningSession.delete({
      where: { id: sessionId },
    });
  }

  /**
   * Generate proposal suggestions based on preferences
   * In production, this would call an AI service
   */
  private generateProposalSuggestions(
    session: any,
    days: number,
  ): ProposalResponseDto[] {
    const interests = session.interests || [];
    const pace = session.preferredPace || 'moderate';
    const hasChildren = session.hasChildren || false;
    const budgetMax = session.budgetMax
      ? Number(session.budgetMax)
      : days * 100;

    const proposals: ProposalResponseDto[] = [];

    // Proposal 1: Relaxed cultural experience
    proposals.push({
      index: 0,
      title: 'Cultural Discovery',
      description:
        'A relaxed journey through local culture, history, and authentic experiences',
      estimatedCost: budgetMax * 0.7,
      pace: 'relaxed',
      highlights: [
        'Visit local museums and galleries',
        'Walking tour of historic district',
        'Traditional cooking class',
        'Evening cultural performance',
      ],
      dailyBreakdown: this.generateDailyBreakdown(days, 'cultural', hasChildren),
    });

    // Proposal 2: Adventure and nature
    proposals.push({
      index: 1,
      title: 'Adventure Explorer',
      description:
        'Active exploration of natural wonders and outdoor adventures',
      estimatedCost: budgetMax * 0.85,
      pace: 'packed',
      highlights: [
        'Guided hiking excursions',
        'Water sports activities',
        'Wildlife spotting',
        'Sunset adventure tour',
      ],
      dailyBreakdown: this.generateDailyBreakdown(
        days,
        'adventure',
        hasChildren,
      ),
    });

    // Proposal 3: Balanced mix
    proposals.push({
      index: 2,
      title: 'Best of Both Worlds',
      description:
        'Perfect balance of relaxation, culture, and local experiences',
      estimatedCost: budgetMax * 0.8,
      pace: 'moderate',
      highlights: [
        'Morning at leisure',
        'Curated sightseeing',
        'Local food experiences',
        'Flexible evening options',
      ],
      dailyBreakdown: this.generateDailyBreakdown(days, 'balanced', hasChildren),
    });

    return proposals;
  }

  private generateDailyBreakdown(
    days: number,
    theme: string,
    hasChildren: boolean,
  ): ProposalResponseDto['dailyBreakdown'] {
    const breakdown: ProposalResponseDto['dailyBreakdown'] = [];

    for (let i = 1; i <= days; i++) {
      const activities: { title: string; duration: string; type: string }[] =
        [];

      if (theme === 'cultural') {
        activities.push(
          { title: 'Morning museum visit', duration: '2-3 hours', type: 'culture' },
          { title: 'Local lunch experience', duration: '1.5 hours', type: 'food' },
          { title: 'Afternoon walking tour', duration: '2 hours', type: 'sightseeing' },
        );
      } else if (theme === 'adventure') {
        activities.push(
          { title: 'Early morning hike', duration: '3-4 hours', type: 'nature' },
          { title: 'Picnic lunch', duration: '1 hour', type: 'food' },
          { title: 'Afternoon water activity', duration: '2-3 hours', type: 'adventure' },
        );
      } else {
        activities.push(
          { title: 'Relaxed morning', duration: '2 hours', type: 'leisure' },
          { title: 'Sightseeing', duration: '2-3 hours', type: 'sightseeing' },
          { title: 'Evening dining', duration: '2 hours', type: 'food' },
        );
      }

      if (hasChildren) {
        activities.push({
          title: 'Family-friendly activity',
          duration: '1-2 hours',
          type: 'family',
        });
      }

      breakdown.push({
        day: i,
        theme: i === 1 ? 'Arrival & Orientation' : i === days ? 'Departure Day' : `Day ${i} Exploration`,
        activities,
      });
    }

    return breakdown;
  }

  private mapToResponse(session: any): SessionResponseDto {
    return {
      id: session.id,
      userId: session.userId,
      propertyId: session.propertyId,
      season: session.season,
      startDate: session.startDate,
      endDate: session.endDate,
      budgetMin: session.budgetMin ? Number(session.budgetMin) : undefined,
      budgetMax: session.budgetMax ? Number(session.budgetMax) : undefined,
      currency: session.currency,
      interests: session.interests,
      numberOfGuests: session.numberOfGuests,
      hasChildren: session.hasChildren,
      childrenAges: session.childrenAges,
      mobilityNeeds: session.mobilityNeeds,
      preferredPace: session.preferredPace,
      proposals: session.proposals as any[],
      selectedProposalIndex: session.selectedProposalIndex,
      currentStep: session.currentStep,
      isCompleted: session.isCompleted,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }
}
