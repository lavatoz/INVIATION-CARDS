import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import prisma from '../config/db';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Get public wedding invitation by slug
 * STRICT REQUIREMENTS:
 * - Only published invitations are returned
 * - No owner personal data (email, id, passwordHash)
 * - No guest records, RSVP private tables, or payment transactions
 * - Events ordered chronologically by startTime
 * - Family members and media ordered by sortOrder
 */
export const getPublicInvitationBySlug = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const rawSlug = (req.params.slug || '').trim().toLowerCase();

    if (!rawSlug || !slugRegex.test(rawSlug)) {
      res.status(400).json({
        success: false,
        message: 'Invalid wedding invitation slug format.',
      });
      return;
    }

    const invitation = await prisma.weddingInvitation.findUnique({
      where: { slug: rawSlug },
      select: {
        id: true,
        slug: true,
        titleEn: true,
        titleMl: true,
        descriptionEn: true,
        descriptionMl: true,
        weddingDate: true,
        isPublished: true,
        designSettings: true,
        enableGifts: true,
        giftHeadingEn: true,
        giftHeadingMl: true,
        giftIntroEn: true,
        giftIntroMl: true,
        suggestedGiftAmounts: true,
        paymentConfig: true,
        createdAt: true,
        coupleDetails: {
          select: {
            partner1NameEn: true,
            partner1NameMl: true,
            partner1Role: true,
            partner1TitleEn: true,
            partner1TitleMl: true,
            partner1BioEn: true,
            partner1BioMl: true,
            partner1PhotoUrl: true,
            partner2NameEn: true,
            partner2NameMl: true,
            partner2Role: true,
            partner2TitleEn: true,
            partner2TitleMl: true,
            partner2BioEn: true,
            partner2BioMl: true,
            partner2PhotoUrl: true,
            coverPhotoUrl: true,
            storyEn: true,
            storyMl: true,
          },
        },
        familyMembers: {
          select: {
            id: true,
            nameEn: true,
            nameMl: true,
            relationEn: true,
            relationMl: true,
            descriptionEn: true,
            descriptionMl: true,
            side: true,
            sortOrder: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
        venues: {
          select: {
            id: true,
            nameEn: true,
            nameMl: true,
            addressEn: true,
            addressMl: true,
            district: true,
            state: true,
            pincode: true,
            landmarkEn: true,
            landmarkMl: true,
            googleMapsUrl: true,
            capacity: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        events: {
          select: {
            id: true,
            titleEn: true,
            titleMl: true,
            eventType: true,
            descriptionEn: true,
            descriptionMl: true,
            startTime: true,
            endTime: true,
            dressCodeEn: true,
            dressCodeMl: true,
            sortOrder: true,
            venue: {
              select: {
                id: true,
                nameEn: true,
                nameMl: true,
                addressEn: true,
                addressMl: true,
                district: true,
                state: true,
                landmarkEn: true,
                landmarkMl: true,
                googleMapsUrl: true,
              },
            },
          },
          orderBy: { startTime: 'asc' }, // Strict requirement: Chronological order!
        },
        media: {
          select: {
            id: true,
            fileName: true,
            captionEn: true,
            captionMl: true,
            mediaType: true,
            sortOrder: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
        sponsors: {
          where: { isActive: true },
          select: {
            id: true,
            nameEn: true,
            nameMl: true,
            category: true,
            sponsorType: true,
            logoUrl: true,
            websiteUrl: true,
            descriptionEn: true,
            descriptionMl: true,
            contactPhone: true,
            contactEmail: true,
            socialLinks: true,
            discountOfferEn: true,
            discountOfferMl: true,
            sortOrder: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!invitation) {
      res.status(404).json({
        success: false,
        message: 'Wedding invitation not found.',
      });
      return;
    }

    // Strict requirement: Only published invitations can be viewed publicly
    if (!invitation.isPublished) {
      res.status(404).json({
        success: false,
        message: 'This wedding invitation is currently in draft mode and not yet published by the hosts.',
      });
      return;
    }

    // Add safe media URL paths without exposing internal filesystem
    const sanitizedMedia = invitation.media.map((m) => ({
      ...m,
      url: `/api/media/${encodeURIComponent(m.fileName)}`,
    }));

    // Payment gateway security check: do not expose private keys or secrets
    const paymentConfig = (invitation.paymentConfig as any) || {};
    const isPaymentGatewayReady = Boolean(
      paymentConfig.isConfigured &&
      (paymentConfig.keyId || paymentConfig.upiId || paymentConfig.merchantId)
    );

    const parsedSuggestedAmounts = (invitation.suggestedGiftAmounts || '200,500,2000')
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0);

    // Omit sensitive paymentConfig from public response
    const { paymentConfig: _omittedConfig, ...publicInvitationData } = invitation;

    res.status(200).json({
      success: true,
      data: {
        invitation: {
          ...publicInvitationData,
          suggestedGiftAmounts: parsedSuggestedAmounts,
          isPaymentGatewayReady,
          media: sanitizedMedia,
          sponsors: invitation.sponsors || [],
        },
      },
    });
  } catch (error) {
    console.error('Fetch public invitation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve public wedding invitation.',
    });
  }
};

/**
 * Serve local disk media safely with directory traversal protection
 */
export const serveLocalMedia = (req: Request, res: Response): void => {
  try {
    const rawFileName = req.params.fileName;
    if (!rawFileName) {
      res.status(400).json({ success: false, message: 'File name required' });
      return;
    }

    // Sanitize to prevent path traversal (e.g. ../../)
    const safeFileName = path.basename(rawFileName);
    const uploadsDir = path.resolve(__dirname, '../../uploads');
    const targetPath = path.join(uploadsDir, safeFileName);

    // Verify target path remains within uploadsDir
    if (!targetPath.startsWith(uploadsDir)) {
      res.status(403).json({ success: false, message: 'Forbidden file access' });
      return;
    }

    if (!fs.existsSync(targetPath)) {
      res.status(404).json({ success: false, message: 'Media file not found' });
      return;
    }

    res.sendFile(targetPath);
  } catch (error) {
    console.error('Serve media error:', error);
    res.status(500).json({ success: false, message: 'Error serving media file' });
  }
};
