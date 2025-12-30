import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/database';
import { MailService } from '@/mail';
import {
  SplitPaymentStatus,
  ParticipantPaymentStatus,
} from '@prisma/client';
import {
  CreateSplitPaymentDto,
  SplitPaymentResponseDto,
  ParticipantPaymentLinkDto,
  ProcessParticipantPaymentDto,
} from './dto';

@Injectable()
export class SplitPaymentService {
  private readonly logger = new Logger(SplitPaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Create a split payment (PROD-096.1)
   */
  async createSplitPayment(
    userId: string,
    dto: CreateSplitPaymentDto,
  ): Promise<SplitPaymentResponseDto> {
    // Validate that either rentPaymentId or transactionId is provided
    if (!dto.rentPaymentId && !dto.transactionId) {
      throw new BadRequestException(
        'Either rentPaymentId or transactionId must be provided',
      );
    }

    // Validate participants sum equals total
    const participantSum = dto.participants.reduce((sum, p) => sum + p.amount, 0);
    if (Math.abs(participantSum - dto.totalAmount) > 0.01) {
      throw new BadRequestException(
        `Participant amounts (${participantSum}) must equal total amount (${dto.totalAmount})`,
      );
    }

    // Create split payment with participants
    const splitPayment = await this.prisma.splitPayment.create({
      data: {
        rentPaymentId: dto.rentPaymentId,
        transactionId: dto.transactionId,
        totalAmount: dto.totalAmount,
        currency: dto.currency || 'EUR',
        createdById: userId,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        participants: {
          create: dto.participants.map((p) => ({
            email: p.email,
            name: p.name,
            amount: p.amount,
            currency: dto.currency || 'EUR',
          })),
        },
      },
      include: {
        participants: true,
      },
    });

    // Send payment link emails to all participants
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    for (const participant of splitPayment.participants) {
      const paymentLinkUrl = `${frontendUrl}/pay/${participant.paymentToken}`;

      // Update participant with payment link
      await this.prisma.splitPaymentParticipant.update({
        where: { id: participant.id },
        data: { paymentLinkUrl },
      });

      // Send email notification
      await this.sendPaymentLinkEmail(
        participant.email,
        participant.name || 'Participant',
        participant.amount.toString(),
        splitPayment.currency,
        paymentLinkUrl,
      );
    }

    this.logger.log(
      `Created split payment ${splitPayment.id} with ${dto.participants.length} participants`,
    );

    return this.mapToResponse(splitPayment);
  }

  /**
   * Get split payment by ID
   */
  async getSplitPayment(
    userId: string,
    splitPaymentId: string,
  ): Promise<SplitPaymentResponseDto> {
    const splitPayment = await this.prisma.splitPayment.findUnique({
      where: { id: splitPaymentId },
      include: { participants: true },
    });

    if (!splitPayment) {
      throw new NotFoundException('Split payment not found');
    }

    // Check access (creator or participant)
    const isCreator = splitPayment.createdById === userId;
    const isParticipant = splitPayment.participants.some(
      (p) => p.userId === userId,
    );

    if (!isCreator && !isParticipant) {
      throw new ForbiddenException('Access denied');
    }

    return this.mapToResponse(splitPayment);
  }

  /**
   * Get participant payment links (PROD-096.3)
   */
  async getPaymentLinks(
    userId: string,
    splitPaymentId: string,
  ): Promise<ParticipantPaymentLinkDto[]> {
    const splitPayment = await this.prisma.splitPayment.findUnique({
      where: { id: splitPaymentId },
      include: { participants: true },
    });

    if (!splitPayment) {
      throw new NotFoundException('Split payment not found');
    }

    // Only creator can get all links
    if (splitPayment.createdById !== userId) {
      throw new ForbiddenException('Only the creator can get payment links');
    }

    return splitPayment.participants.map((p) => ({
      participantId: p.id,
      email: p.email,
      amount: p.amount.toString(),
      paymentToken: p.paymentToken,
      paymentLinkUrl: p.paymentLinkUrl || '',
    }));
  }

  /**
   * Get payment details by token (for payment page)
   */
  async getPaymentByToken(paymentToken: string): Promise<{
    participantId: string;
    email: string;
    name: string | null;
    amount: string;
    currency: string;
    status: ParticipantPaymentStatus;
    splitPaymentId: string;
    totalAmount: string;
  }> {
    const participant = await this.prisma.splitPaymentParticipant.findUnique({
      where: { paymentToken },
      include: { splitPayment: true },
    });

    if (!participant) {
      throw new NotFoundException('Payment not found');
    }

    return {
      participantId: participant.id,
      email: participant.email,
      name: participant.name,
      amount: participant.amount.toString(),
      currency: participant.currency,
      status: participant.status,
      splitPaymentId: participant.splitPaymentId,
      totalAmount: participant.splitPayment.totalAmount.toString(),
    };
  }

  /**
   * Process participant payment
   */
  async processPayment(
    dto: ProcessParticipantPaymentDto,
  ): Promise<{ sessionUrl: string }> {
    const participant = await this.prisma.splitPaymentParticipant.findUnique({
      where: { paymentToken: dto.paymentToken },
      include: { splitPayment: true },
    });

    if (!participant) {
      throw new NotFoundException('Payment not found');
    }

    if (participant.status === ParticipantPaymentStatus.PAID) {
      throw new BadRequestException('This payment has already been made');
    }

    if (participant.splitPayment.status === SplitPaymentStatus.EXPIRED) {
      throw new BadRequestException('This split payment has expired');
    }

    // For now, return mock payment URL
    // In production, create Stripe checkout session
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const mockSessionId = `mock_split_${participant.id}_${Date.now()}`;

    await this.prisma.splitPaymentParticipant.update({
      where: { id: participant.id },
      data: { stripeSessionId: mockSessionId },
    });

    return {
      sessionUrl: `${frontendUrl}/pay/${dto.paymentToken}/checkout?session=${mockSessionId}`,
    };
  }

  /**
   * Complete participant payment (for mock/testing)
   */
  async completePayment(paymentToken: string): Promise<SplitPaymentResponseDto> {
    const participant = await this.prisma.splitPaymentParticipant.findUnique({
      where: { paymentToken },
      include: { splitPayment: { include: { participants: true } } },
    });

    if (!participant) {
      throw new NotFoundException('Payment not found');
    }

    if (participant.status === ParticipantPaymentStatus.PAID) {
      return this.mapToResponse(participant.splitPayment);
    }

    // Update participant status
    await this.prisma.splitPaymentParticipant.update({
      where: { id: participant.id },
      data: {
        status: ParticipantPaymentStatus.PAID,
        paidAt: new Date(),
      },
    });

    // Update split payment totals
    const updatedSplitPayment = await this.prisma.splitPayment.update({
      where: { id: participant.splitPaymentId },
      data: {
        paidAmount: {
          increment: participant.amount,
        },
        paidCount: {
          increment: 1,
        },
      },
      include: { participants: true },
    });

    // Check if all payments completed
    const allPaid = updatedSplitPayment.participants.every(
      (p) =>
        p.id === participant.id ||
        p.status === ParticipantPaymentStatus.PAID,
    );

    // Actually update the participant we just paid
    updatedSplitPayment.participants = updatedSplitPayment.participants.map(
      (p) =>
        p.id === participant.id
          ? { ...p, status: ParticipantPaymentStatus.PAID, paidAt: new Date() }
          : p,
    );

    // Update split payment status
    const newStatus = allPaid
      ? SplitPaymentStatus.COMPLETED
      : SplitPaymentStatus.PARTIAL;

    if (updatedSplitPayment.status !== newStatus) {
      await this.prisma.splitPayment.update({
        where: { id: participant.splitPaymentId },
        data: { status: newStatus },
      });
      updatedSplitPayment.status = newStatus;
    }

    this.logger.log(
      `Participant ${participant.id} completed payment for split ${participant.splitPaymentId}`,
    );

    return this.mapToResponse(updatedSplitPayment);
  }

  /**
   * Send reminder to unpaid participants
   */
  async sendReminders(splitPaymentId: string, userId: string): Promise<number> {
    const splitPayment = await this.prisma.splitPayment.findUnique({
      where: { id: splitPaymentId },
      include: { participants: true },
    });

    if (!splitPayment) {
      throw new NotFoundException('Split payment not found');
    }

    if (splitPayment.createdById !== userId) {
      throw new ForbiddenException('Only the creator can send reminders');
    }

    const unpaidParticipants = splitPayment.participants.filter(
      (p) => p.status === ParticipantPaymentStatus.PENDING,
    );

    for (const participant of unpaidParticipants) {
      await this.sendReminderEmail(
        participant.email,
        participant.name || 'Participant',
        participant.amount.toString(),
        splitPayment.currency,
        participant.paymentLinkUrl || '',
      );

      await this.prisma.splitPaymentParticipant.update({
        where: { id: participant.id },
        data: {
          reminderSentAt: new Date(),
          reminderCount: { increment: 1 },
        },
      });
    }

    return unpaidParticipants.length;
  }

  /**
   * Cancel split payment
   */
  async cancelSplitPayment(
    splitPaymentId: string,
    userId: string,
  ): Promise<SplitPaymentResponseDto> {
    const splitPayment = await this.prisma.splitPayment.findUnique({
      where: { id: splitPaymentId },
      include: { participants: true },
    });

    if (!splitPayment) {
      throw new NotFoundException('Split payment not found');
    }

    if (splitPayment.createdById !== userId) {
      throw new ForbiddenException('Only the creator can cancel');
    }

    if (splitPayment.status === SplitPaymentStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel completed split payment');
    }

    // Check if any payments have been made
    const hasPaidParticipants = splitPayment.participants.some(
      (p) => p.status === ParticipantPaymentStatus.PAID,
    );

    if (hasPaidParticipants) {
      throw new BadRequestException(
        'Cannot cancel - some participants have already paid. Contact support for refunds.',
      );
    }

    const updated = await this.prisma.splitPayment.update({
      where: { id: splitPaymentId },
      data: { status: SplitPaymentStatus.CANCELLED },
      include: { participants: true },
    });

    return this.mapToResponse(updated);
  }

  /**
   * Get user's split payments
   */
  async getUserSplitPayments(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    data: SplitPaymentResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;

    const [splitPayments, total] = await Promise.all([
      this.prisma.splitPayment.findMany({
        where: {
          OR: [
            { createdById: userId },
            { participants: { some: { userId } } },
          ],
        },
        include: { participants: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.splitPayment.count({
        where: {
          OR: [
            { createdById: userId },
            { participants: { some: { userId } } },
          ],
        },
      }),
    ]);

    return {
      data: splitPayments.map((sp) => this.mapToResponse(sp)),
      total,
      page,
      limit,
    };
  }

  private async sendPaymentLinkEmail(
    email: string,
    name: string,
    amount: string,
    currency: string,
    paymentLinkUrl: string,
  ): Promise<void> {
    try {
      await this.mailService.sendMail({
        to: email,
        subject: 'Your Share of Payment is Ready - 12done',
        template: 'split-payment-invite',
        context: {
          name,
          amount,
          currency,
          paymentLinkUrl,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to send payment link email to ${email}`, error);
    }
  }

  private async sendReminderEmail(
    email: string,
    name: string,
    amount: string,
    currency: string,
    paymentLinkUrl: string,
  ): Promise<void> {
    try {
      await this.mailService.sendMail({
        to: email,
        subject: 'Reminder: Your Payment is Still Pending - 12done',
        template: 'split-payment-reminder',
        context: {
          name,
          amount,
          currency,
          paymentLinkUrl,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to send reminder email to ${email}`, error);
    }
  }

  private mapToResponse(splitPayment: any): SplitPaymentResponseDto {
    return {
      id: splitPayment.id,
      totalAmount: splitPayment.totalAmount.toString(),
      currency: splitPayment.currency,
      status: splitPayment.status,
      paidAmount: splitPayment.paidAmount.toString(),
      paidCount: splitPayment.paidCount,
      totalParticipants: splitPayment.participants.length,
      expiresAt: splitPayment.expiresAt,
      participants: splitPayment.participants.map((p: any) => ({
        id: p.id,
        email: p.email,
        name: p.name,
        amount: p.amount.toString(),
        status: p.status,
        paidAt: p.paidAt,
      })),
      createdAt: splitPayment.createdAt,
    };
  }
}
