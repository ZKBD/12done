import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@/database';
import { MailService } from '@/mail';
import { NotificationFrequency, Prisma } from '@prisma/client';

export interface DigestProperty {
  id: string;
  title: string;
  city: string;
  price: string;
  bedrooms?: number;
  bathrooms?: number;
  squareMeters?: number;
  imageUrl?: string;
}

// Type for the Prisma query result with includes
interface SearchAgentWithMatches {
  id: string;
  name: string;
  unsubscribeToken: string | null;
  user: {
    id: string;
    email: string;
    firstName: string;
  };
  pendingMatches: Array<{
    id: string;
    property: {
      id: string;
      title: string;
      city: string;
      basePrice: Prisma.Decimal;
      currency: string;
      bedrooms: number | null;
      bathrooms: number | null;
      squareMeters: number | null;
      media: Array<{ url: string }>;
    };
  }>;
}

@Injectable()
export class SearchAgentDigestService {
  private readonly logger = new Logger(SearchAgentDigestService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  /**
   * Send daily digest emails at 9:00 AM (PROD-041.5)
   */
  @Cron('0 9 * * *', { name: 'search-agent-daily-digest' })
  async sendDailyDigests(): Promise<void> {
    this.logger.log('Starting daily search agent digest job');
    await this.sendDigests(NotificationFrequency.DAILY_DIGEST);
    this.logger.log('Completed daily search agent digest job');
  }

  /**
   * Send weekly digest emails on Monday at 9:00 AM (PROD-041.5)
   */
  @Cron('0 9 * * 1', { name: 'search-agent-weekly-digest' })
  async sendWeeklyDigests(): Promise<void> {
    this.logger.log('Starting weekly search agent digest job');
    await this.sendDigests(NotificationFrequency.WEEKLY_DIGEST);
    this.logger.log('Completed weekly search agent digest job');
  }

  /**
   * Send digest emails for a specific frequency
   */
  async sendDigests(frequency: NotificationFrequency): Promise<number> {
    // Find all agents with pending matches for this frequency
    const agentsWithMatches = (await this.prisma.searchAgent.findMany({
      where: {
        isActive: true,
        emailNotifications: true,
        notificationFrequency: frequency,
        pendingMatches: {
          some: {
            notifiedAt: null,
          },
        },
      },
      include: {
        user: {
          select: { id: true, email: true, firstName: true },
        },
        pendingMatches: {
          where: { notifiedAt: null },
          include: {
            property: {
              select: {
                id: true,
                title: true,
                city: true,
                basePrice: true,
                currency: true,
                bedrooms: true,
                bathrooms: true,
                squareMeters: true,
                media: {
                  take: 1,
                  select: { url: true },
                  orderBy: { sortOrder: 'asc' },
                },
              },
            },
          },
          orderBy: { matchedAt: 'desc' },
        },
      },
    })) as unknown as SearchAgentWithMatches[];

    this.logger.log(`Found ${agentsWithMatches.length} agents with pending ${frequency} matches`);

    let sentCount = 0;

    for (const agent of agentsWithMatches) {
      try {
        const matchCount = agent.pendingMatches.length;
        const properties: DigestProperty[] = agent.pendingMatches.map((m) => ({
          id: m.property.id,
          title: m.property.title,
          city: m.property.city,
          price: `${m.property.basePrice} ${m.property.currency}`,
          bedrooms: m.property.bedrooms ?? undefined,
          bathrooms: m.property.bathrooms ?? undefined,
          squareMeters: m.property.squareMeters ?? undefined,
          imageUrl: m.property.media[0]?.url,
        }));

        const searchUrl = `/search?agentId=${agent.id}`;
        const unsubscribeUrl = agent.unsubscribeToken
          ? `/search-agents/unsubscribe?token=${agent.unsubscribeToken}`
          : undefined;

        await this.mailService.sendSearchAgentDigestEmail(
          agent.user.email,
          agent.user.firstName,
          agent.name,
          matchCount,
          properties,
          searchUrl,
          unsubscribeUrl,
        );

        // Mark matches as notified
        const matchIds = agent.pendingMatches.map((m) => m.id);
        await this.prisma.searchAgentMatch.updateMany({
          where: { id: { in: matchIds } },
          data: { notifiedAt: new Date() },
        });

        sentCount++;
        this.logger.log(`Sent ${frequency} digest to ${agent.user.email} with ${matchCount} matches`);
      } catch (error) {
        this.logger.error(`Failed to send ${frequency} digest for agent ${agent.id}:`, error);
      }
    }

    return sentCount;
  }

  /**
   * Clean up old notified matches (keep 30 days for history)
   */
  @Cron('0 2 * * *', { name: 'cleanup-old-search-agent-matches' })
  async cleanupOldMatches(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.prisma.searchAgentMatch.deleteMany({
      where: {
        notifiedAt: {
          not: null,
          lt: thirtyDaysAgo,
        },
      },
    });

    this.logger.log(`Cleaned up ${result.count} old search agent matches`);
  }
}
