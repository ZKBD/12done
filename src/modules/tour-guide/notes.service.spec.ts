import { Test, TestingModule } from '@nestjs/testing';
import { NotesService } from './notes.service';
import { PrismaService } from '@/database/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('NotesService', () => {
  let service: NotesService;

  const mockPrismaService = {
    userNote: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockNote = {
    id: 'note-123',
    userId: 'user-123',
    placeId: 'place-123',
    placeName: 'Test Museum',
    text: 'Great place to visit!',
    photos: [{ url: 'https://example.com/photo1.jpg', caption: 'View' }],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<NotesService>(NotesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNote', () => {
    it('should create a new note', async () => {
      mockPrismaService.userNote.create.mockResolvedValue(mockNote);

      const result = await service.createNote('user-123', {
        placeId: 'place-123',
        placeName: 'Test Museum',
        text: 'Great place to visit!',
      });

      expect(result).toBeDefined();
      expect(result.placeId).toBe('place-123');
      expect(result.text).toBe('Great place to visit!');
      expect(mockPrismaService.userNote.create).toHaveBeenCalled();
    });

    it('should create note with photos', async () => {
      const noteWithPhotos = {
        ...mockNote,
        photos: [{ url: 'https://example.com/photo.jpg', caption: 'View' }],
      };
      mockPrismaService.userNote.create.mockResolvedValue(noteWithPhotos);

      const result = await service.createNote('user-123', {
        placeId: 'place-123',
        placeName: 'Test Museum',
        text: 'Great view!',
        photos: [{ url: 'https://example.com/photo.jpg', caption: 'View' }],
      });

      expect(result.photos).toHaveLength(1);
      expect(result.photos[0].url).toBe('https://example.com/photo.jpg');
    });
  });

  describe('getUserNotes', () => {
    it('should return user notes', async () => {
      mockPrismaService.userNote.findMany.mockResolvedValue([mockNote]);

      const result = await service.getUserNotes('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('Great place to visit!');
    });

    it('should filter by placeId', async () => {
      mockPrismaService.userNote.findMany.mockResolvedValue([mockNote]);

      await service.getUserNotes('user-123', { placeId: 'place-123' });

      expect(mockPrismaService.userNote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ placeId: 'place-123' }),
        }),
      );
    });

    it('should apply limit and offset', async () => {
      mockPrismaService.userNote.findMany.mockResolvedValue([]);

      await service.getUserNotes('user-123', { limit: 10, offset: 5 });

      expect(mockPrismaService.userNote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 5,
        }),
      );
    });
  });

  describe('getNotesForPlace', () => {
    it('should return notes for a specific place', async () => {
      mockPrismaService.userNote.findMany.mockResolvedValue([mockNote]);

      const result = await service.getNotesForPlace('user-123', 'place-123');

      expect(result).toHaveLength(1);
      expect(mockPrismaService.userNote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123', placeId: 'place-123' },
        }),
      );
    });

    it('should return empty array if no notes for place', async () => {
      mockPrismaService.userNote.findMany.mockResolvedValue([]);

      const result = await service.getNotesForPlace('user-123', 'place-456');

      expect(result).toHaveLength(0);
    });
  });

  describe('getNote', () => {
    it('should return a note by ID', async () => {
      mockPrismaService.userNote.findUnique.mockResolvedValue(mockNote);

      const result = await service.getNote('user-123', 'note-123');

      expect(result.id).toBe('note-123');
    });

    it('should throw NotFoundException if note not found', async () => {
      mockPrismaService.userNote.findUnique.mockResolvedValue(null);

      await expect(
        service.getNote('user-123', 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if note owned by different user', async () => {
      mockPrismaService.userNote.findUnique.mockResolvedValue({
        ...mockNote,
        userId: 'other-user',
      });

      await expect(
        service.getNote('user-123', 'note-123'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateNote', () => {
    it('should update note text', async () => {
      mockPrismaService.userNote.findUnique.mockResolvedValue(mockNote);
      mockPrismaService.userNote.update.mockResolvedValue({
        ...mockNote,
        text: 'Updated text',
      });

      const result = await service.updateNote('user-123', 'note-123', {
        text: 'Updated text',
      });

      expect(result.text).toBe('Updated text');
    });

    it('should throw NotFoundException if note not found', async () => {
      mockPrismaService.userNote.findUnique.mockResolvedValue(null);

      await expect(
        service.updateNote('user-123', 'non-existent', { text: 'test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not owner', async () => {
      mockPrismaService.userNote.findUnique.mockResolvedValue({
        ...mockNote,
        userId: 'other-user',
      });

      await expect(
        service.updateNote('user-123', 'note-123', { text: 'test' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update photos', async () => {
      mockPrismaService.userNote.findUnique.mockResolvedValue(mockNote);
      const newPhotos = [{ url: 'https://new.com/photo.jpg', caption: 'New' }];
      mockPrismaService.userNote.update.mockResolvedValue({
        ...mockNote,
        photos: newPhotos,
      });

      const result = await service.updateNote('user-123', 'note-123', {
        photos: newPhotos,
      });

      expect(result.photos).toHaveLength(1);
      expect(result.photos[0].url).toBe('https://new.com/photo.jpg');
    });
  });

  describe('addPhotosToNote', () => {
    it('should add photos to existing note', async () => {
      mockPrismaService.userNote.findUnique.mockResolvedValue({
        ...mockNote,
        photos: [{ url: 'https://existing.com/photo.jpg', caption: 'Existing' }],
      });
      mockPrismaService.userNote.update.mockResolvedValue({
        ...mockNote,
        photos: [
          { url: 'https://existing.com/photo.jpg', caption: 'Existing' },
          { url: 'https://new.com/photo.jpg', caption: 'New' },
        ],
      });

      const result = await service.addPhotosToNote('user-123', 'note-123', [
        { url: 'https://new.com/photo.jpg', caption: 'New' },
      ]);

      expect(result.photos).toHaveLength(2);
    });

    it('should throw NotFoundException if note not found', async () => {
      mockPrismaService.userNote.findUnique.mockResolvedValue(null);

      await expect(
        service.addPhotosToNote('user-123', 'non-existent', []),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not owner', async () => {
      mockPrismaService.userNote.findUnique.mockResolvedValue({
        ...mockNote,
        userId: 'other-user',
      });

      await expect(
        service.addPhotosToNote('user-123', 'note-123', []),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should limit photos to maximum of 10', async () => {
      const existingPhotos = Array.from({ length: 8 }, (_, i) => ({
        url: `https://example.com/photo${i}.jpg`,
        caption: `Photo ${i}`,
      }));
      mockPrismaService.userNote.findUnique.mockResolvedValue({
        ...mockNote,
        photos: existingPhotos,
      });
      mockPrismaService.userNote.update.mockImplementation(async ({ data }) => ({
        ...mockNote,
        photos: data.photos,
      }));

      const newPhotos = Array.from({ length: 5 }, (_, i) => ({
        url: `https://new.com/photo${i}.jpg`,
        caption: `New ${i}`,
      }));

      const result = await service.addPhotosToNote('user-123', 'note-123', newPhotos);

      expect(result.photos.length).toBeLessThanOrEqual(10);
    });
  });

  describe('removePhotoFromNote', () => {
    it('should remove a photo from note', async () => {
      mockPrismaService.userNote.findUnique.mockResolvedValue({
        ...mockNote,
        photos: [
          { url: 'https://example.com/photo1.jpg', caption: 'Photo 1' },
          { url: 'https://example.com/photo2.jpg', caption: 'Photo 2' },
        ],
      });
      mockPrismaService.userNote.update.mockResolvedValue({
        ...mockNote,
        photos: [{ url: 'https://example.com/photo2.jpg', caption: 'Photo 2' }],
      });

      const result = await service.removePhotoFromNote(
        'user-123',
        'note-123',
        'https://example.com/photo1.jpg',
      );

      expect(result.photos).toHaveLength(1);
      expect(result.photos[0].url).toBe('https://example.com/photo2.jpg');
    });

    it('should throw NotFoundException if note not found', async () => {
      mockPrismaService.userNote.findUnique.mockResolvedValue(null);

      await expect(
        service.removePhotoFromNote('user-123', 'non-existent', 'url'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not owner', async () => {
      mockPrismaService.userNote.findUnique.mockResolvedValue({
        ...mockNote,
        userId: 'other-user',
      });

      await expect(
        service.removePhotoFromNote('user-123', 'note-123', 'url'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteNote', () => {
    it('should delete a note', async () => {
      mockPrismaService.userNote.findUnique.mockResolvedValue(mockNote);
      mockPrismaService.userNote.delete.mockResolvedValue(mockNote);

      await expect(
        service.deleteNote('user-123', 'note-123'),
      ).resolves.not.toThrow();

      expect(mockPrismaService.userNote.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException if note not found', async () => {
      mockPrismaService.userNote.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteNote('user-123', 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not owner', async () => {
      mockPrismaService.userNote.findUnique.mockResolvedValue({
        ...mockNote,
        userId: 'other-user',
      });

      await expect(
        service.deleteNote('user-123', 'note-123'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getNotesCount', () => {
    it('should return count of user notes', async () => {
      mockPrismaService.userNote.count.mockResolvedValue(5);

      const result = await service.getNotesCount('user-123');

      expect(result).toBe(5);
    });
  });

  describe('getPlaceNotesCount', () => {
    it('should return count of notes for a specific place', async () => {
      mockPrismaService.userNote.count.mockResolvedValue(3);

      const result = await service.getPlaceNotesCount('user-123', 'place-123');

      expect(result).toBe(3);
      expect(mockPrismaService.userNote.count).toHaveBeenCalledWith({
        where: { userId: 'user-123', placeId: 'place-123' },
      });
    });
  });
});
