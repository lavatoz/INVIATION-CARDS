import { Response } from 'express';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * Validate image file magic bytes against its claimed file extension.
 * Supports PNG, JPEG (JPG), and WebP formats.
 */
function isValidImageMagicBytes(buffer: Buffer, ext: string): boolean {
  if (buffer.length < 12) return false;

  if (ext === '.png') {
    // PNG magic bytes: 89 50 4E 47 (0x89 'P' 'N' 'G')
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }

  if (ext === '.jpg' || ext === '.jpeg') {
    // JPEG SOI marker: FF D8 FF
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (ext === '.webp') {
    // WebP: RIFF at byte 0-3 and WEBP at byte 8-11
    const riff = buffer.toString('ascii', 0, 4);
    const webp = buffer.toString('ascii', 8, 12);
    return riff === 'RIFF' && webp === 'WEBP';
  }

  return false;
}

const mediaUpdateSchema = z.object({
  captionEn: z.string().trim().optional().nullable(),
  captionMl: z.string().trim().optional().nullable(),
  sortOrder: z.number().int().optional(),
});

/**
 * Helper to process and store an image buffer
 */
function processAndSaveImage(
  fileName: string,
  fileData: string
): { uniqueFileName: string; persistentDataUrl: string; buffer: Buffer; mimeType: string } {
  const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
  const ext = path.extname(fileName).toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    throw new Error('Invalid file format. Allowed: PNG, JPG, JPEG, WEBP.');
  }

  const base64Data = fileData.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  if (buffer.length === 0) {
    throw new Error('File content cannot be empty.');
  }

  if (buffer.length > 10 * 1024 * 1024) {
    throw new Error('Photo file size cannot exceed 10MB.');
  }

  if (!isValidImageMagicBytes(buffer, ext)) {
    throw new Error('Invalid file content. Must be valid PNG, JPG, or WebP.');
  }

  const uploadsDir = path.resolve(__dirname, '../../uploads');
  if (!fs.existsSync(uploadsDir)) {
    try {
      fs.mkdirSync(uploadsDir, { recursive: true });
    } catch (err) {}
  }

  const uniqueFileName = `photo_${crypto.randomUUID()}${ext}`;
  const targetPath = path.join(uploadsDir, uniqueFileName);

  try {
    fs.writeFileSync(targetPath, buffer);
  } catch (err) {
    console.warn('Could not write photo to local disk:', err);
  }

  const mimeMap: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
  };
  const mimeType = mimeMap[ext] || 'image/png';
  const persistentDataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;

  return { uniqueFileName, persistentDataUrl, buffer, mimeType };
}

/**
 * Get all media photos for an invitation (Owner)
 */
export const getOwnerMedia = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { invitationId } = req.params;

    const mediaList = await prisma.media.findMany({
      where: {
        weddingInvitationId: invitationId,
        mediaType: 'IMAGE',
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    const sanitized = mediaList.map((m) => ({
      ...m,
      url: `/api/media/${encodeURIComponent(m.fileName)}`,
    }));

    res.status(200).json({
      success: true,
      data: { media: sanitized, total: sanitized.length },
    });
  } catch (error) {
    console.error('Get owner media error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve media items.' });
  }
};

/**
 * Upload single or multiple gallery photos
 */
export const uploadGalleryPhoto = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { invitationId } = req.params;
    const { fileName, fileData, captionEn, captionMl, photos } = req.body;

    // Check if batch upload
    if (Array.isArray(photos) && photos.length > 0) {
      const currentCount = await prisma.media.count({
        where: { weddingInvitationId: invitationId, mediaType: 'IMAGE' },
      });

      const createdRecords = [];
      for (let i = 0; i < photos.length; i++) {
        const item = photos[i];
        const { uniqueFileName, persistentDataUrl, buffer, mimeType } = processAndSaveImage(
          item.fileName,
          item.fileData
        );

        const record = await prisma.media.create({
          data: {
            weddingInvitationId: invitationId,
            fileName: uniqueFileName,
            originalName: item.fileName,
            filePath: persistentDataUrl,
            mimeType,
            fileSize: buffer.length,
            mediaType: 'IMAGE',
            captionEn: item.captionEn || null,
            captionMl: item.captionMl || null,
            sortOrder: currentCount + i,
          },
        });

        createdRecords.push({
          ...record,
          url: `/api/media/${uniqueFileName}`,
        });
      }

      res.status(201).json({
        success: true,
        message: `${createdRecords.length} photos uploaded successfully.`,
        data: { mediaList: createdRecords },
      });
      return;
    }

    if (!fileData || !fileName) {
      res.status(400).json({
        success: false,
        message: 'File data and file name are required.',
      });
      return;
    }

    const { uniqueFileName, persistentDataUrl, buffer, mimeType } = processAndSaveImage(
      fileName,
      fileData
    );

    const currentCount = await prisma.media.count({
      where: { weddingInvitationId: invitationId, mediaType: 'IMAGE' },
    });

    const mediaRecord = await prisma.media.create({
      data: {
        weddingInvitationId: invitationId,
        fileName: uniqueFileName,
        originalName: fileName,
        filePath: persistentDataUrl,
        mimeType,
        fileSize: buffer.length,
        mediaType: 'IMAGE',
        captionEn: captionEn || null,
        captionMl: captionMl || null,
        sortOrder: currentCount,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Photo uploaded successfully.',
      data: {
        media: {
          ...mediaRecord,
          url: `/api/media/${uniqueFileName}`,
        },
      },
    });
  } catch (error: any) {
    console.error('Upload gallery photo error:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to upload photo.' });
  }
};

/**
 * Replace an existing photograph image file while preserving or updating its metadata
 */
export const replaceMediaPhoto = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { invitationId, mediaId } = req.params;
    const { fileName, fileData, captionEn, captionMl } = req.body;

    if (!fileData || !fileName) {
      res.status(400).json({
        success: false,
        message: 'Replacement file data and file name are required.',
      });
      return;
    }

    const existing = await prisma.media.findFirst({
      where: { id: mediaId, weddingInvitationId: invitationId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Media record not found.' });
      return;
    }

    // Process new image
    const { uniqueFileName, persistentDataUrl, buffer, mimeType } = processAndSaveImage(
      fileName,
      fileData
    );

    // Clean old disk file if present
    try {
      const uploadsDir = path.resolve(__dirname, '../../uploads');
      const oldTargetPath = path.join(uploadsDir, existing.fileName);
      if (fs.existsSync(oldTargetPath)) {
        fs.unlinkSync(oldTargetPath);
      }
    } catch (fsErr) {
      console.warn('Could not remove old file during photo replacement:', fsErr);
    }

    const updated = await prisma.media.update({
      where: { id: mediaId },
      data: {
        fileName: uniqueFileName,
        originalName: fileName,
        filePath: persistentDataUrl,
        mimeType,
        fileSize: buffer.length,
        captionEn: captionEn !== undefined ? captionEn : existing.captionEn,
        captionMl: captionMl !== undefined ? captionMl : existing.captionMl,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Photograph replaced successfully.',
      data: {
        media: {
          ...updated,
          url: `/api/media/${updated.fileName}`,
        },
      },
    });
  } catch (error: any) {
    console.error('Replace media photo error:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to replace photo.' });
  }
};

/**
 * Update media details (caption/title/description)
 */
export const updateMedia = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { invitationId, mediaId } = req.params;

    const parseResult = mediaUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: parseResult.error.errors[0]?.message || 'Validation failed',
      });
      return;
    }

    const existing = await prisma.media.findFirst({
      where: { id: mediaId, weddingInvitationId: invitationId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Media record not found.' });
      return;
    }

    const updated = await prisma.media.update({
      where: { id: mediaId },
      data: {
        captionEn: parseResult.data.captionEn !== undefined ? parseResult.data.captionEn : existing.captionEn,
        captionMl: parseResult.data.captionMl !== undefined ? parseResult.data.captionMl : existing.captionMl,
        sortOrder: parseResult.data.sortOrder !== undefined ? parseResult.data.sortOrder : existing.sortOrder,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Photo details updated successfully.',
      data: {
        media: {
          ...updated,
          url: `/api/media/${updated.fileName}`,
        },
      },
    });
  } catch (error) {
    console.error('Update media error:', error);
    res.status(500).json({ success: false, message: 'Failed to update photo details.' });
  }
};

/**
 * Reorder media items
 */
export const reorderMedia = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { invitationId } = req.params;
    const { items } = req.body; // Array of { id: string, sortOrder: number }

    if (!Array.isArray(items)) {
      res.status(400).json({ success: false, message: 'Items array is required.' });
      return;
    }

    await prisma.$transaction(
      items.map((item) =>
        prisma.media.updateMany({
          where: { id: item.id, weddingInvitationId: invitationId },
          data: { sortOrder: item.sortOrder },
        })
      )
    );

    res.status(200).json({
      success: true,
      message: 'Photo order updated successfully.',
    });
  } catch (error) {
    console.error('Reorder media error:', error);
    res.status(500).json({ success: false, message: 'Failed to reorder photos.' });
  }
};

/**
 * Delete a media item
 */
export const deleteMedia = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { invitationId, mediaId } = req.params;

    const existing = await prisma.media.findFirst({
      where: { id: mediaId, weddingInvitationId: invitationId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Media record not found.' });
      return;
    }

    // Try deleting local file from uploads
    try {
      const uploadsDir = path.resolve(__dirname, '../../uploads');
      const targetPath = path.join(uploadsDir, existing.fileName);
      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
      }
    } catch (fsErr) {
      console.warn('Could not remove file from disk during media deletion:', fsErr);
    }

    await prisma.media.delete({
      where: { id: mediaId },
    });

    res.status(200).json({
      success: true,
      message: 'Photo deleted successfully.',
    });
  } catch (error) {
    console.error('Delete media error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete photo.' });
  }
};
