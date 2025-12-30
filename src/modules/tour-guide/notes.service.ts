import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CreateNoteDto,
  UpdateNoteDto,
  NoteResponseDto,
  NotePhotoDto,
} from './dto';

@Injectable()
export class NotesService {
  private readonly logger = new Logger(NotesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a note on a POI (PROD-132.2)
   */
  async createNote(userId: string, dto: CreateNoteDto): Promise<NoteResponseDto> {
    const note = await this.prisma.userNote.create({
      data: {
        userId,
        placeId: dto.placeId,
        placeName: dto.placeName,
        text: dto.text,
        photos: (dto.photos ?? []) as unknown as Prisma.InputJsonValue,
      },
    });

    this.logger.log(`User ${userId} created note on place ${dto.placeId}`);
    return this.mapToResponse(note);
  }

  /**
   * Get all notes for a user
   */
  async getUserNotes(
    userId: string,
    options?: { placeId?: string; limit?: number; offset?: number },
  ): Promise<NoteResponseDto[]> {
    const where: Prisma.UserNoteWhereInput = { userId };

    if (options?.placeId) {
      where.placeId = options.placeId;
    }

    const notes = await this.prisma.userNote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    });

    return notes.map((note) => this.mapToResponse(note));
  }

  /**
   * Get notes for a specific POI (PROD-132.4)
   */
  async getNotesForPlace(
    userId: string,
    placeId: string,
  ): Promise<NoteResponseDto[]> {
    const notes = await this.prisma.userNote.findMany({
      where: {
        userId,
        placeId,
      },
      orderBy: { createdAt: 'desc' },
    });

    return notes.map((note) => this.mapToResponse(note));
  }

  /**
   * Get a specific note
   */
  async getNote(userId: string, noteId: string): Promise<NoteResponseDto> {
    const note = await this.prisma.userNote.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    if (note.userId !== userId) {
      throw new ForbiddenException('Cannot access note owned by another user');
    }

    return this.mapToResponse(note);
  }

  /**
   * Update a note (PROD-132.5)
   */
  async updateNote(
    userId: string,
    noteId: string,
    dto: UpdateNoteDto,
  ): Promise<NoteResponseDto> {
    const existing = await this.prisma.userNote.findUnique({
      where: { id: noteId },
    });

    if (!existing) {
      throw new NotFoundException('Note not found');
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException('Cannot modify note owned by another user');
    }

    const updateData: Prisma.UserNoteUpdateInput = {};
    if (dto.text !== undefined) updateData.text = dto.text;
    if (dto.photos !== undefined) updateData.photos = dto.photos as unknown as Prisma.InputJsonValue;

    const updated = await this.prisma.userNote.update({
      where: { id: noteId },
      data: updateData,
    });

    this.logger.log(`User ${userId} updated note ${noteId}`);
    return this.mapToResponse(updated);
  }

  /**
   * Add photos to a note (PROD-132.3)
   */
  async addPhotosToNote(
    userId: string,
    noteId: string,
    photos: NotePhotoDto[],
  ): Promise<NoteResponseDto> {
    const existing = await this.prisma.userNote.findUnique({
      where: { id: noteId },
    });

    if (!existing) {
      throw new NotFoundException('Note not found');
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException('Cannot modify note owned by another user');
    }

    const existingPhotos = (existing.photos as unknown as NotePhotoDto[]) || [];
    const allPhotos = [...existingPhotos, ...photos].slice(0, 10); // Max 10 photos

    const updated = await this.prisma.userNote.update({
      where: { id: noteId },
      data: { photos: allPhotos as unknown as Prisma.InputJsonValue },
    });

    this.logger.log(`User ${userId} added photos to note ${noteId}`);
    return this.mapToResponse(updated);
  }

  /**
   * Remove a photo from a note
   */
  async removePhotoFromNote(
    userId: string,
    noteId: string,
    photoUrl: string,
  ): Promise<NoteResponseDto> {
    const existing = await this.prisma.userNote.findUnique({
      where: { id: noteId },
    });

    if (!existing) {
      throw new NotFoundException('Note not found');
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException('Cannot modify note owned by another user');
    }

    const existingPhotos = (existing.photos as unknown as NotePhotoDto[]) || [];
    const filteredPhotos = existingPhotos.filter((p) => p.url !== photoUrl);

    const updated = await this.prisma.userNote.update({
      where: { id: noteId },
      data: { photos: filteredPhotos as unknown as Prisma.InputJsonValue },
    });

    this.logger.log(`User ${userId} removed photo from note ${noteId}`);
    return this.mapToResponse(updated);
  }

  /**
   * Delete a note (PROD-132.5)
   */
  async deleteNote(userId: string, noteId: string): Promise<void> {
    const existing = await this.prisma.userNote.findUnique({
      where: { id: noteId },
    });

    if (!existing) {
      throw new NotFoundException('Note not found');
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException('Cannot delete note owned by another user');
    }

    await this.prisma.userNote.delete({
      where: { id: noteId },
    });

    this.logger.log(`User ${userId} deleted note ${noteId}`);
  }

  /**
   * Get notes count for a user
   */
  async getNotesCount(userId: string): Promise<number> {
    return this.prisma.userNote.count({
      where: { userId },
    });
  }

  /**
   * Get notes count for a specific place
   */
  async getPlaceNotesCount(userId: string, placeId: string): Promise<number> {
    return this.prisma.userNote.count({
      where: { userId, placeId },
    });
  }

  private mapToResponse(note: {
    id: string;
    placeId: string;
    placeName: string | null;
    text: string;
    photos: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): NoteResponseDto {
    return {
      id: note.id,
      placeId: note.placeId,
      placeName: note.placeName ?? undefined,
      text: note.text,
      photos: (note.photos as NotePhotoDto[]) || [],
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    };
  }
}
