import { Response } from 'express';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

const sponsorSchema = z.object({
  nameEn: z.string().trim().min(1, 'Company or partner name (English) is required'),
  nameMl: z.string().trim().optional().nullable(),
  category: z.string().trim().min(1, 'Category is required'),
  sponsorType: z.string().trim().optional().nullable(),
  logoUrl: z.string().trim().optional().nullable(),
  websiteUrl: z.string().trim().optional().nullable(),
  descriptionEn: z.string().trim().optional().nullable(),
  descriptionMl: z.string().trim().optional().nullable(),
  contactPhone: z.string().trim().optional().nullable(),
  contactEmail: z.string().email('Invalid email').trim().optional().nullable().or(z.literal('')),
  socialLinks: z.string().trim().optional().nullable(),
  discountOfferEn: z.string().trim().optional().nullable(),
  discountOfferMl: z.string().trim().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
});

export const getOwnerSponsors = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { invitationId } = req.params;

    const sponsors = await prisma.weddingSponsor.findMany({
      where: { weddingInvitationId: invitationId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    res.status(200).json({
      success: true,
      data: { sponsors, total: sponsors.length },
    });
  } catch (error) {
    console.error('Get owner sponsors error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve sponsors.' });
  }
};

export const addSponsor = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { invitationId } = req.params;

    const parseResult = sponsorSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: parseResult.error.errors[0]?.message || 'Validation failed',
      });
      return;
    }

    const count = await prisma.weddingSponsor.count({
      where: { weddingInvitationId: invitationId },
    });

    const data = parseResult.data;

    const sponsor = await prisma.weddingSponsor.create({
      data: {
        weddingInvitationId: invitationId,
        nameEn: data.nameEn,
        nameMl: data.nameMl || null,
        category: data.category,
        sponsorType: data.sponsorType || data.category,
        logoUrl: data.logoUrl || null,
        websiteUrl: data.websiteUrl || null,
        descriptionEn: data.descriptionEn || null,
        descriptionMl: data.descriptionMl || null,
        contactPhone: data.contactPhone || null,
        contactEmail: data.contactEmail || null,
        socialLinks: data.socialLinks || null,
        discountOfferEn: data.discountOfferEn || null,
        discountOfferMl: data.discountOfferMl || null,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? count,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Sponsor added successfully.',
      data: { sponsor },
    });
  } catch (error) {
    console.error('Add sponsor error:', error);
    res.status(500).json({ success: false, message: 'Failed to add sponsor.' });
  }
};

export const updateSponsor = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { invitationId, sponsorId } = req.params;

    const existing = await prisma.weddingSponsor.findFirst({
      where: { id: sponsorId, weddingInvitationId: invitationId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Sponsor not found.' });
      return;
    }

    const parseResult = sponsorSchema.partial().safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: parseResult.error.errors[0]?.message || 'Validation failed',
      });
      return;
    }

    const data = parseResult.data;

    const updated = await prisma.weddingSponsor.update({
      where: { id: sponsorId },
      data: {
        nameEn: data.nameEn ?? existing.nameEn,
        nameMl: data.nameMl !== undefined ? (data.nameMl || null) : existing.nameMl,
        category: data.category ?? existing.category,
        sponsorType: data.sponsorType ?? existing.sponsorType,
        logoUrl: data.logoUrl !== undefined ? (data.logoUrl || null) : existing.logoUrl,
        websiteUrl: data.websiteUrl !== undefined ? (data.websiteUrl || null) : existing.websiteUrl,
        descriptionEn: data.descriptionEn !== undefined ? (data.descriptionEn || null) : existing.descriptionEn,
        descriptionMl: data.descriptionMl !== undefined ? (data.descriptionMl || null) : existing.descriptionMl,
        contactPhone: data.contactPhone !== undefined ? (data.contactPhone || null) : existing.contactPhone,
        contactEmail: data.contactEmail !== undefined ? (data.contactEmail || null) : existing.contactEmail,
        socialLinks: data.socialLinks !== undefined ? (data.socialLinks || null) : existing.socialLinks,
        discountOfferEn: data.discountOfferEn !== undefined ? (data.discountOfferEn || null) : existing.discountOfferEn,
        discountOfferMl: data.discountOfferMl !== undefined ? (data.discountOfferMl || null) : existing.discountOfferMl,
        isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
        sortOrder: data.sortOrder !== undefined ? data.sortOrder : existing.sortOrder,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Sponsor updated successfully.',
      data: { sponsor: updated },
    });
  } catch (error) {
    console.error('Update sponsor error:', error);
    res.status(500).json({ success: false, message: 'Failed to update sponsor.' });
  }
};

export const deleteSponsor = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { invitationId, sponsorId } = req.params;

    const existing = await prisma.weddingSponsor.findFirst({
      where: { id: sponsorId, weddingInvitationId: invitationId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Sponsor not found.' });
      return;
    }

    await prisma.weddingSponsor.delete({
      where: { id: sponsorId },
    });

    res.status(200).json({
      success: true,
      message: 'Sponsor removed successfully.',
    });
  } catch (error) {
    console.error('Delete sponsor error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete sponsor.' });
  }
};

export const reorderSponsors = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { invitationId } = req.params;
    const { items } = req.body; // Array of { id: string, sortOrder: number }

    if (!Array.isArray(items)) {
      res.status(400).json({ success: false, message: 'Items array required' });
      return;
    }

    await prisma.$transaction(
      items.map((item) =>
        prisma.weddingSponsor.updateMany({
          where: { id: item.id, weddingInvitationId: invitationId },
          data: { sortOrder: item.sortOrder },
        })
      )
    );

    res.status(200).json({
      success: true,
      message: 'Sponsor order updated successfully.',
    });
  } catch (error) {
    console.error('Reorder sponsors error:', error);
    res.status(500).json({ success: false, message: 'Failed to reorder sponsors.' });
  }
};

/**
 * Upload sponsor logo to local disk
 */
export const uploadSponsorLogo = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { fileName, fileData, mimeType } = req.body;

    if (!fileData || !fileName) {
      res.status(400).json({
        success: false,
        message: 'File data and file name are required.',
      });
      return;
    }

    // Supported formats
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];
    const ext = path.extname(fileName).toLowerCase();

    if (!allowedExtensions.includes(ext)) {
      res.status(400).json({
        success: false,
        message: 'Invalid file format. Allowed: PNG, JPG, JPEG, WEBP, SVG.',
      });
      return;
    }

    // Decode base64
    const base64Data = fileData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Limit size to 5MB
    if (buffer.length > 5 * 1024 * 1024) {
      res.status(400).json({
        success: false,
        message: 'Logo file size cannot exceed 5MB.',
      });
      return;
    }

    const uploadsDir = path.resolve(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const uniqueFileName = `sponsor_${crypto.randomUUID()}${ext}`;
    const targetPath = path.join(uploadsDir, uniqueFileName);

    fs.writeFileSync(targetPath, buffer);

    const publicUrl = `/api/media/${uniqueFileName}`;

    res.status(200).json({
      success: true,
      message: 'Logo uploaded successfully.',
      data: {
        fileName: uniqueFileName,
        url: publicUrl,
      },
    });
  } catch (error) {
    console.error('Upload sponsor logo error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload logo.' });
  }
};
