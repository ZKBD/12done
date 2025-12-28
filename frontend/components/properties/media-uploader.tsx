'use client';

import { useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  Upload,
  X,
  GripVertical,
  Star,
  Loader2,
  ImageIcon,
  Video,
  Eye,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn, getImageUrl } from '@/lib/utils';
import {
  useUploadMedia,
  useDeleteMedia,
  useReorderMedia,
  useSetPrimaryMedia,
  useUpdateMedia,
} from '@/hooks/use-my-properties';
import type { PropertyMedia } from '@/lib/types';

interface MediaUploaderProps {
  propertyId: string;
  media: PropertyMedia[];
  className?: string;
}

export function MediaUploader({
  propertyId,
  media,
  className,
}: MediaUploaderProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<PropertyMedia | null>(null);
  const [editMedia, setEditMedia] = useState<PropertyMedia | null>(null);
  const [caption, setCaption] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMedia = useUploadMedia(propertyId);
  const deleteMedia = useDeleteMedia(propertyId);
  const reorderMedia = useReorderMedia(propertyId);
  const setPrimaryMedia = useSetPrimaryMedia(propertyId);
  const updateMedia = useUpdateMedia(propertyId);

  const photos = media.filter((m) => m.type === 'photo').sort((a, b) => a.sortOrder - b.sortOrder);
  const videos = media.filter((m) => m.type === 'video');

  const handleFileDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  }, []);

  const handleFileDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(false);

      const files = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith('image/')
      );

      if (files.length > 0) {
        await uploadMedia.mutateAsync({ files, type: 'photo' });
      }
    },
    [uploadMedia]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        await uploadMedia.mutateAsync({ files, type: 'photo' });
      }
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [uploadMedia]
  );

  const handleSetPrimary = useCallback(
    async (mediaId: string) => {
      await setPrimaryMedia.mutateAsync(mediaId);
    },
    [setPrimaryMedia]
  );

  const handleDelete = useCallback(
    async (mediaId: string) => {
      await deleteMedia.mutateAsync(mediaId);
    },
    [deleteMedia]
  );

  const handleEditCaption = useCallback((mediaItem: PropertyMedia) => {
    setEditMedia(mediaItem);
    setCaption(mediaItem.caption || '');
  }, []);

  const handleSaveCaption = useCallback(async () => {
    if (editMedia) {
      await updateMedia.mutateAsync({
        mediaId: editMedia.id,
        data: { caption },
      });
      setEditMedia(null);
      setCaption('');
    }
  }, [editMedia, caption, updateMedia]);

  const handleReorder = useCallback(
    async (fromIndex: number, toIndex: number) => {
      const newOrder = [...photos];
      const [removed] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, removed);
      await reorderMedia.mutateAsync(newOrder.map((m) => m.id));
    },
    [photos, reorderMedia]
  );

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    setDraggedIndex(index);
  }, []);

  const handleCardDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  }, [draggedIndex]);

  const handleCardDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (!isNaN(sourceIndex) && sourceIndex !== targetIndex) {
      handleReorder(sourceIndex, targetIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [handleReorder]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  const handleCardDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  return (
    <div className={className}>
      {/* Upload Area */}
      <div
        onDragOver={handleFileDragOver}
        onDragLeave={handleFileDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDraggingOver
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
          uploadMedia.isPending && 'pointer-events-none opacity-50'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        {uploadMedia.isPending ? (
          <div className="flex flex-col items-center">
            <Loader2 className="h-10 w-10 text-primary animate-spin mb-3" />
            <p className="font-medium">Uploading...</p>
          </div>
        ) : (
          <>
            <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium mb-1">
              Drag and drop images here, or click to browse
            </p>
            <p className="text-sm text-muted-foreground">
              Supports: JPG, PNG, WebP (max 10MB each)
            </p>
          </>
        )}
      </div>

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">
              Photos ({photos.length})
            </h3>
            <p className="text-sm text-muted-foreground">
              Drag to reorder. First photo is the cover image.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {photos.map((photo, index) => (
              <MediaCard
                key={photo.id}
                media={photo}
                index={index}
                isPrimary={photo.isPrimary}
                isDragging={draggedIndex === index}
                isDragOver={dragOverIndex === index}
                onSetPrimary={() => handleSetPrimary(photo.id)}
                onDelete={() => handleDelete(photo.id)}
                onPreview={() => setPreviewMedia(photo)}
                onEdit={() => handleEditCaption(photo)}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleCardDragOver(e, index)}
                onDrop={(e) => handleCardDrop(e, index)}
                onDragLeave={handleCardDragLeave}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {photos.length === 0 && !uploadMedia.isPending && (
        <div className="mt-6 p-8 bg-muted/30 rounded-lg text-center">
          <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium mb-1">No photos yet</p>
          <p className="text-sm text-muted-foreground">
            Add photos to make your listing stand out
          </p>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog
        open={previewMedia !== null}
        onOpenChange={() => setPreviewMedia(null)}
      >
        <DialogContent className="max-w-4xl">
          {previewMedia && (
            <div className="relative aspect-[16/9]">
              <Image
                src={getImageUrl(previewMedia.url)}
                alt={previewMedia.caption || 'Property photo'}
                fill
                className="object-contain"
              />
            </div>
          )}
          {previewMedia?.caption && (
            <p className="text-center text-muted-foreground">
              {previewMedia.caption}
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Caption Dialog */}
      <Dialog open={editMedia !== null} onOpenChange={() => setEditMedia(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Caption</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {editMedia && (
              <div className="relative aspect-video rounded-lg overflow-hidden">
                <Image
                  src={getImageUrl(editMedia.thumbnailUrl || editMedia.url)}
                  alt="Preview"
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="caption">Caption</Label>
              <Input
                id="caption"
                placeholder="Add a caption for this photo..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditMedia(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveCaption}
                disabled={updateMedia.isPending}
              >
                {updateMedia.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface MediaCardProps {
  media: PropertyMedia;
  index: number;
  isPrimary: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onSetPrimary: () => void;
  onDelete: () => void;
  onPreview: () => void;
  onEdit: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDragEnd: () => void;
}

function MediaCard({
  media,
  index,
  isPrimary,
  isDragging,
  isDragOver,
  onSetPrimary,
  onDelete,
  onPreview,
  onEdit,
  onDragStart,
  onDragOver,
  onDrop,
  onDragLeave,
  onDragEnd,
}: MediaCardProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragLeave={onDragLeave}
      onDragEnd={onDragEnd}
      className={cn(
        'group relative aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all cursor-grab active:cursor-grabbing',
        isPrimary ? 'border-primary' : 'border-transparent',
        isDragging && 'opacity-50 scale-95',
        isDragOver && 'border-primary border-dashed scale-105'
      )}
    >
      <Image
        src={getImageUrl(media.thumbnailUrl || media.url)}
        alt={media.caption || `Photo ${index + 1}`}
        fill
        className="object-cover"
        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
      />

      {/* Primary Badge */}
      {isPrimary && (
        <Badge className="absolute top-2 left-2 gap-1" variant="default">
          <Star className="h-3 w-3 fill-current" />
          Cover
        </Badge>
      )}

      {/* Drag Handle */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="p-1 bg-black/50 rounded cursor-move">
          <GripVertical className="h-4 w-4 text-white" />
        </div>
      </div>

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        <Button
          size="icon"
          variant="secondary"
          className="h-8 w-8"
          onClick={onPreview}
        >
          <Eye className="h-4 w-4" />
        </Button>
        {!isPrimary && (
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8"
            onClick={onSetPrimary}
            title="Set as cover photo"
          >
            <Star className="h-4 w-4" />
          </Button>
        )}
        <Button
          size="icon"
          variant="destructive"
          className="h-8 w-8"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Caption indicator */}
      {media.caption && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
          <p className="text-xs text-white truncate">{media.caption}</p>
        </div>
      )}
    </div>
  );
}
