import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

// --- Validation Schemas ---

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createInvitationSchema = z.object({
  basic: z.object({
    titleEn: z.string().trim().min(3, 'Wedding title (English) must be at least 3 characters'),
    titleMl: z.string().trim().optional().nullable(),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(slugRegex, 'Slug must contain only lowercase letters, numbers, and hyphens'),
    weddingDate: z.string().datetime().optional().nullable(),
    descriptionEn: z.string().trim().optional().nullable(),
    descriptionMl: z.string().trim().optional().nullable(),
  }),
  couple: z.object({
    groomNameEn: z.string().trim().min(2, 'Groom name (English) is required'),
    groomNameMl: z.string().trim().optional().nullable(),
    groomTitleEn: z.string().trim().optional().nullable(),
    groomTitleMl: z.string().trim().optional().nullable(),
    groomBioEn: z.string().trim().optional().nullable(),
    groomBioMl: z.string().trim().optional().nullable(),
    brideNameEn: z.string().trim().min(2, 'Bride name (English) is required'),
    brideNameMl: z.string().trim().optional().nullable(),
    brideTitleEn: z.string().trim().optional().nullable(),
    brideTitleMl: z.string().trim().optional().nullable(),
    brideBioEn: z.string().trim().optional().nullable(),
    brideBioMl: z.string().trim().optional().nullable(),
    storyEn: z.string().trim().optional().nullable(),
    storyMl: z.string().trim().optional().nullable(),
  }),
  familyMembers: z
    .array(
      z.object({
        nameEn: z.string().trim().min(1, 'Family member name is required'),
        nameMl: z.string().trim().optional().nullable(),
        relationEn: z.string().trim().min(1, 'Relationship is required'),
        relationMl: z.string().trim().optional().nullable(),
        descriptionEn: z.string().trim().optional().nullable(),
        descriptionMl: z.string().trim().optional().nullable(),
        side: z.enum(['GROOM', 'BRIDE', 'BOTH']),
        sortOrder: z.number().int().default(0),
      })
    )
    .optional()
    .default([]),
  venues: z
    .array(
      z.object({
        tempId: z.string().optional(),
        nameEn: z.string().trim().min(2, 'Venue name is required'),
        nameMl: z.string().trim().optional().nullable(),
        addressEn: z.string().trim().min(3, 'Address is required'),
        addressMl: z.string().trim().optional().nullable(),
        district: z.string().trim().optional().nullable(),
        state: z.string().trim().optional().nullable(),
        pincode: z.string().trim().optional().nullable(),
        landmarkEn: z.string().trim().optional().nullable(),
        landmarkMl: z.string().trim().optional().nullable(),
        googleMapsUrl: z.string().trim().optional().nullable(),
        capacity: z.number().int().positive().optional().nullable(),
      })
    )
    .optional()
    .default([]),
  events: z
    .array(
      z.object({
        titleEn: z.string().trim().min(2, 'Event name is required'),
        titleMl: z.string().trim().optional().nullable(),
        eventType: z.string().trim().optional().nullable(),
        descriptionEn: z.string().trim().optional().nullable(),
        descriptionMl: z.string().trim().optional().nullable(),
        startTime: z.string().datetime(),
        endTime: z.string().datetime().optional().nullable(),
        dressCodeEn: z.string().trim().optional().nullable(),
        dressCodeMl: z.string().trim().optional().nullable(),
        sortOrder: z.number().int().default(0),
        venueIndex: z.number().int().optional().nullable(),
      })
    )
    .optional()
    .default([]),
  designSettings: z.record(z.any()).optional().nullable(),
});

// --- Controller Actions ---

/**
 * Check slug availability
 */
export const checkSlug = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const rawSlug = (req.query.slug as string || '').trim().toLowerCase();
    const excludeId = req.query.excludeId as string | undefined;

    if (!rawSlug || !slugRegex.test(rawSlug)) {
      res.status(400).json({
        success: false,
        message: 'Invalid slug format. Must contain only lowercase letters, numbers, and hyphens.',
        available: false,
      });
      return;
    }

    const existing = await prisma.weddingInvitation.findUnique({
      where: { slug: rawSlug },
      select: { id: true },
    });

    if (existing && existing.id !== excludeId) {
      res.status(200).json({
        success: true,
        available: false,
        message: 'Slug is already in use by another wedding.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      available: true,
      message: 'Slug is available.',
    });
  } catch (error) {
    console.error('Check slug error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify slug availability.',
    });
  }
};

/**
 * Create a new wedding invitation with all relations in a single transaction
 */
export const createWeddingInvitation = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const ownerId = req.user?.id;
    if (!ownerId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const parseResult = createInvitationSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: parseResult.error.errors[0]?.message || 'Validation failed',
        errors: parseResult.error.format(),
      });
      return;
    }

    const { basic, couple, familyMembers, venues, events, designSettings } = parseResult.data;

    // Check slug uniqueness
    const existingSlug = await prisma.weddingInvitation.findUnique({
      where: { slug: basic.slug },
    });

    if (existingSlug) {
      res.status(409).json({
        success: false,
        message: `The slug "${basic.slug}" is already taken. Please choose another unique slug.`,
      });
      return;
    }

    // Execute atomic creation in transaction
    const createdInvitation = await prisma.$transaction(async (tx) => {
      // 1. Create main WeddingInvitation
      const invitation = await tx.weddingInvitation.create({
        data: {
          ownerId,
          slug: basic.slug,
          titleEn: basic.titleEn,
          titleMl: basic.titleMl || null,
          descriptionEn: basic.descriptionEn || null,
          descriptionMl: basic.descriptionMl || null,
          weddingDate: basic.weddingDate ? new Date(basic.weddingDate) : null,
          isPublished: false,
          designSettings: designSettings || undefined,
        },
      });

      // 2. Create CoupleDetails
      await tx.coupleDetails.create({
        data: {
          weddingInvitationId: invitation.id,
          partner1NameEn: couple.groomNameEn,
          partner1NameMl: couple.groomNameMl || null,
          partner1Role: 'Groom',
          partner1TitleEn: couple.groomTitleEn || null,
          partner1TitleMl: couple.groomTitleMl || null,
          partner1BioEn: couple.groomBioEn || null,
          partner1BioMl: couple.groomBioMl || null,
          partner2NameEn: couple.brideNameEn,
          partner2NameMl: couple.brideNameMl || null,
          partner2Role: 'Bride',
          partner2TitleEn: couple.brideTitleEn || null,
          partner2TitleMl: couple.brideTitleMl || null,
          partner2BioEn: couple.brideBioEn || null,
          partner2BioMl: couple.brideBioMl || null,
          storyEn: couple.storyEn || null,
          storyMl: couple.storyMl || null,
        },
      });

      // 3. Create Venues and keep id map
      const createdVenueIds: string[] = [];
      for (const venue of venues) {
        const v = await tx.weddingVenue.create({
          data: {
            weddingInvitationId: invitation.id,
            nameEn: venue.nameEn,
            nameMl: venue.nameMl || null,
            addressEn: venue.addressEn,
            addressMl: venue.addressMl || null,
            district: venue.district || null,
            state: venue.state || null,
            pincode: venue.pincode || null,
            landmarkEn: venue.landmarkEn || null,
            landmarkMl: venue.landmarkMl || null,
            googleMapsUrl: venue.googleMapsUrl || null,
            capacity: venue.capacity || null,
          },
        });
        createdVenueIds.push(v.id);
      }

      // 4. Create Events with assigned venueId
      for (let i = 0; i < events.length; i++) {
        const ev = events[i];
        let assignedVenueId: string | null = null;
        if (
          typeof ev.venueIndex === 'number' &&
          ev.venueIndex >= 0 &&
          ev.venueIndex < createdVenueIds.length
        ) {
          assignedVenueId = createdVenueIds[ev.venueIndex];
        }

        await tx.weddingEvent.create({
          data: {
            weddingInvitationId: invitation.id,
            venueId: assignedVenueId,
            titleEn: ev.titleEn,
            titleMl: ev.titleMl || null,
            eventType: ev.eventType || null,
            descriptionEn: ev.descriptionEn || null,
            descriptionMl: ev.descriptionMl || null,
            startTime: new Date(ev.startTime),
            endTime: ev.endTime ? new Date(ev.endTime) : null,
            dressCodeEn: ev.dressCodeEn || null,
            dressCodeMl: ev.dressCodeMl || null,
            sortOrder: ev.sortOrder || i,
          },
        });
      }

      // 5. Create Family Members
      for (let i = 0; i < familyMembers.length; i++) {
        const fam = familyMembers[i];
        await tx.familyMember.create({
          data: {
            weddingInvitationId: invitation.id,
            nameEn: fam.nameEn,
            nameMl: fam.nameMl || null,
            relationEn: fam.relationEn,
            relationMl: fam.relationMl || null,
            descriptionEn: fam.descriptionEn || null,
            descriptionMl: fam.descriptionMl || null,
            side: fam.side,
            sortOrder: fam.sortOrder || i,
          },
        });
      }

      // Return complete invitation object
      return tx.weddingInvitation.findUnique({
        where: { id: invitation.id },
        include: {
          coupleDetails: true,
          familyMembers: { orderBy: { sortOrder: 'asc' } },
          venues: true,
          events: {
            include: { venue: true },
            orderBy: { startTime: 'asc' },
          },
        },
      });
    });

    res.status(201).json({
      success: true,
      message: 'Wedding invitation created successfully as draft.',
      data: {
        invitation: createdInvitation,
      },
    });
  } catch (error) {
    console.error('Create wedding invitation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create wedding invitation. Please check inputs and try again.',
    });
  }
};

/**
 * List all invitations for logged in owner
 */
export const getOwnerInvitations = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const ownerId = req.user?.id;
    if (!ownerId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const invitations = await prisma.weddingInvitation.findMany({
      where: { ownerId },
      include: {
        coupleDetails: true,
        _count: {
          select: {
            guests: true,
            rsvps: true,
            events: true,
            venues: true,
            familyMembers: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: {
        invitations,
      },
    });
  } catch (error) {
    console.error('Fetch owner invitations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve wedding invitations.',
    });
  }
};

/**
 * Get single invitation details for editing
 */
export const getOwnerInvitationById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { invitationId } = req.params;
    const ownerId = req.user?.id;

    const invitation = await prisma.weddingInvitation.findFirst({
      where: {
        id: invitationId,
        ownerId,
      },
      include: {
        coupleDetails: true,
        familyMembers: { orderBy: { sortOrder: 'asc' } },
        events: {
          include: { venue: true },
          orderBy: { startTime: 'asc' },
        },
        venues: { orderBy: { createdAt: 'asc' } },
        _count: {
          select: {
            guests: true,
            rsvps: true,
          },
        },
      },
    });

    if (!invitation) {
      res.status(404).json({
        success: false,
        message: 'Wedding invitation not found or access denied.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        invitation,
      },
    });
  } catch (error) {
    console.error('Fetch single invitation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve wedding invitation details.',
    });
  }
};

/**
 * Update basic overview & design settings
 */
export const updateOverview = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { invitationId } = req.params;
    const {
      titleEn,
      titleMl,
      slug,
      weddingDate,
      descriptionEn,
      descriptionMl,
      isPublished,
      designSettings,
    } = req.body;

    if (!titleEn || titleEn.trim().length < 3) {
      res.status(400).json({
        success: false,
        message: 'Wedding title (English) must be at least 3 characters',
      });
      return;
    }

    if (slug) {
      const cleanSlug = slug.trim().toLowerCase();
      if (!slugRegex.test(cleanSlug)) {
        res.status(400).json({
          success: false,
          message: 'Slug format invalid. Only lowercase letters, numbers, and hyphens are allowed.',
        });
        return;
      }

      const existing = await prisma.weddingInvitation.findUnique({
        where: { slug: cleanSlug },
      });

      if (existing && existing.id !== invitationId) {
        res.status(409).json({
          success: false,
          message: `Slug "${cleanSlug}" is already taken by another wedding.`,
        });
        return;
      }
    }

    const updated = await prisma.weddingInvitation.update({
      where: { id: invitationId },
      data: {
        titleEn: titleEn.trim(),
        titleMl: titleMl ? titleMl.trim() : null,
        slug: slug ? slug.trim().toLowerCase() : undefined,
        weddingDate: weddingDate ? new Date(weddingDate) : null,
        descriptionEn: descriptionEn ? descriptionEn.trim() : null,
        descriptionMl: descriptionMl ? descriptionMl.trim() : null,
        isPublished: typeof isPublished === 'boolean' ? isPublished : undefined,
        designSettings: designSettings !== undefined ? designSettings : undefined,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Wedding overview updated successfully.',
      data: { invitation: updated },
    });
  } catch (error) {
    console.error('Update overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update wedding overview.',
    });
  }
};

/**
 * Update couple details
 */
export const updateCoupleDetails = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { invitationId } = req.params;
    const {
      partner1NameEn,
      partner1NameMl,
      partner1TitleEn,
      partner1TitleMl,
      partner1BioEn,
      partner1BioMl,
      partner2NameEn,
      partner2NameMl,
      partner2TitleEn,
      partner2TitleMl,
      partner2BioEn,
      partner2BioMl,
      storyEn,
      storyMl,
    } = req.body;

    if (!partner1NameEn || !partner2NameEn) {
      res.status(400).json({
        success: false,
        message: 'Both partner names in English are required.',
      });
      return;
    }

    const updatedCouple = await prisma.coupleDetails.upsert({
      where: { weddingInvitationId: invitationId },
      create: {
        weddingInvitationId: invitationId,
        partner1NameEn: partner1NameEn.trim(),
        partner1NameMl: partner1NameMl ? partner1NameMl.trim() : null,
        partner1Role: 'Groom',
        partner1TitleEn: partner1TitleEn ? partner1TitleEn.trim() : null,
        partner1TitleMl: partner1TitleMl ? partner1TitleMl.trim() : null,
        partner1BioEn: partner1BioEn ? partner1BioEn.trim() : null,
        partner1BioMl: partner1BioMl ? partner1BioMl.trim() : null,
        partner2NameEn: partner2NameEn.trim(),
        partner2NameMl: partner2NameMl ? partner2NameMl.trim() : null,
        partner2Role: 'Bride',
        partner2TitleEn: partner2TitleEn ? partner2TitleEn.trim() : null,
        partner2TitleMl: partner2TitleMl ? partner2TitleMl.trim() : null,
        partner2BioEn: partner2BioEn ? partner2BioEn.trim() : null,
        partner2BioMl: partner2BioMl ? partner2BioMl.trim() : null,
        storyEn: storyEn ? storyEn.trim() : null,
        storyMl: storyMl ? storyMl.trim() : null,
      },
      update: {
        partner1NameEn: partner1NameEn.trim(),
        partner1NameMl: partner1NameMl ? partner1NameMl.trim() : null,
        partner1TitleEn: partner1TitleEn ? partner1TitleEn.trim() : null,
        partner1TitleMl: partner1TitleMl ? partner1TitleMl.trim() : null,
        partner1BioEn: partner1BioEn ? partner1BioEn.trim() : null,
        partner1BioMl: partner1BioMl ? partner1BioMl.trim() : null,
        partner2NameEn: partner2NameEn.trim(),
        partner2NameMl: partner2NameMl ? partner2NameMl.trim() : null,
        partner2Role: 'Bride',
        partner2TitleEn: partner2TitleEn ? partner2TitleEn.trim() : null,
        partner2TitleMl: partner2TitleMl ? partner2TitleMl.trim() : null,
        partner2BioEn: partner2BioEn ? partner2BioEn.trim() : null,
        partner2BioMl: partner2BioMl ? partner2BioMl.trim() : null,
        storyEn: storyEn ? storyEn.trim() : null,
        storyMl: storyMl ? storyMl.trim() : null,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Couple details updated successfully.',
      data: { coupleDetails: updatedCouple },
    });
  } catch (error) {
    console.error('Update couple error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update couple details.',
    });
  }
};

/**
 * Manage Family Members
 */
export const addFamilyMember = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { invitationId } = req.params;
    const { nameEn, nameMl, relationEn, relationMl, descriptionEn, descriptionMl, side, sortOrder } =
      req.body;

    if (!nameEn || !relationEn) {
      res.status(400).json({
        success: false,
        message: 'Name and relation in English are required.',
      });
      return;
    }

    const member = await prisma.familyMember.create({
      data: {
        weddingInvitationId: invitationId,
        nameEn: nameEn.trim(),
        nameMl: nameMl ? nameMl.trim() : null,
        relationEn: relationEn.trim(),
        relationMl: relationMl ? relationMl.trim() : null,
        descriptionEn: descriptionEn ? descriptionEn.trim() : null,
        descriptionMl: descriptionMl ? descriptionMl.trim() : null,
        side: side || 'GROOM',
        sortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Family member added.',
      data: { member },
    });
  } catch (error) {
    console.error('Add family error:', error);
    res.status(500).json({ success: false, message: 'Failed to add family member.' });
  }
};

export const updateFamilyMember = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { invitationId, memberId } = req.params;
    const { nameEn, nameMl, relationEn, relationMl, descriptionEn, descriptionMl, side, sortOrder } =
      req.body;

    const existing = await prisma.familyMember.findFirst({
      where: { id: memberId, weddingInvitationId: invitationId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Family member not found.' });
      return;
    }

    const updated = await prisma.familyMember.update({
      where: { id: memberId },
      data: {
        nameEn: nameEn ? nameEn.trim() : existing.nameEn,
        nameMl: nameMl !== undefined ? (nameMl ? nameMl.trim() : null) : existing.nameMl,
        relationEn: relationEn ? relationEn.trim() : existing.relationEn,
        relationMl: relationMl !== undefined ? (relationMl ? relationMl.trim() : null) : existing.relationMl,
        descriptionEn: descriptionEn !== undefined ? (descriptionEn ? descriptionEn.trim() : null) : existing.descriptionEn,
        descriptionMl: descriptionMl !== undefined ? (descriptionMl ? descriptionMl.trim() : null) : existing.descriptionMl,
        side: side || existing.side,
        sortOrder: typeof sortOrder === 'number' ? sortOrder : existing.sortOrder,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Family member updated.',
      data: { member: updated },
    });
  } catch (error) {
    console.error('Update family error:', error);
    res.status(500).json({ success: false, message: 'Failed to update family member.' });
  }
};

export const deleteFamilyMember = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { invitationId, memberId } = req.params;

    const existing = await prisma.familyMember.findFirst({
      where: { id: memberId, weddingInvitationId: invitationId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Family member not found.' });
      return;
    }

    await prisma.familyMember.delete({ where: { id: memberId } });

    res.status(200).json({
      success: true,
      message: 'Family member removed successfully.',
    });
  } catch (error) {
    console.error('Delete family error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete family member.' });
  }
};

/**
 * Manage Venues
 */
export const addVenue = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { invitationId } = req.params;
    const {
      nameEn,
      nameMl,
      addressEn,
      addressMl,
      district,
      state,
      pincode,
      landmarkEn,
      landmarkMl,
      googleMapsUrl,
      capacity,
    } = req.body;

    if (!nameEn || !addressEn) {
      res.status(400).json({
        success: false,
        message: 'Venue name and address in English are required.',
      });
      return;
    }

    const venue = await prisma.weddingVenue.create({
      data: {
        weddingInvitationId: invitationId,
        nameEn: nameEn.trim(),
        nameMl: nameMl ? nameMl.trim() : null,
        addressEn: addressEn.trim(),
        addressMl: addressMl ? addressMl.trim() : null,
        district: district ? district.trim() : null,
        state: state ? state.trim() : null,
        pincode: pincode ? pincode.trim() : null,
        landmarkEn: landmarkEn ? landmarkEn.trim() : null,
        landmarkMl: landmarkMl ? landmarkMl.trim() : null,
        googleMapsUrl: googleMapsUrl ? googleMapsUrl.trim() : null,
        capacity: capacity ? parseInt(capacity, 10) : null,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Venue added successfully.',
      data: { venue },
    });
  } catch (error) {
    console.error('Add venue error:', error);
    res.status(500).json({ success: false, message: 'Failed to add venue.' });
  }
};

export const updateVenue = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { invitationId, venueId } = req.params;
    const {
      nameEn,
      nameMl,
      addressEn,
      addressMl,
      district,
      state,
      pincode,
      landmarkEn,
      landmarkMl,
      googleMapsUrl,
      capacity,
    } = req.body;

    const existing = await prisma.weddingVenue.findFirst({
      where: { id: venueId, weddingInvitationId: invitationId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Venue not found.' });
      return;
    }

    const updated = await prisma.weddingVenue.update({
      where: { id: venueId },
      data: {
        nameEn: nameEn ? nameEn.trim() : existing.nameEn,
        nameMl: nameMl !== undefined ? (nameMl ? nameMl.trim() : null) : existing.nameMl,
        addressEn: addressEn ? addressEn.trim() : existing.addressEn,
        addressMl: addressMl !== undefined ? (addressMl ? addressMl.trim() : null) : existing.addressMl,
        district: district !== undefined ? (district ? district.trim() : null) : existing.district,
        state: state !== undefined ? (state ? state.trim() : null) : existing.state,
        pincode: pincode !== undefined ? (pincode ? pincode.trim() : null) : existing.pincode,
        landmarkEn: landmarkEn !== undefined ? (landmarkEn ? landmarkEn.trim() : null) : existing.landmarkEn,
        landmarkMl: landmarkMl !== undefined ? (landmarkMl ? landmarkMl.trim() : null) : existing.landmarkMl,
        googleMapsUrl: googleMapsUrl !== undefined ? (googleMapsUrl ? googleMapsUrl.trim() : null) : existing.googleMapsUrl,
        capacity: capacity !== undefined ? (capacity ? parseInt(capacity, 10) : null) : existing.capacity,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Venue updated successfully.',
      data: { venue: updated },
    });
  } catch (error) {
    console.error('Update venue error:', error);
    res.status(500).json({ success: false, message: 'Failed to update venue.' });
  }
};

export const deleteVenue = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { invitationId, venueId } = req.params;

    const existing = await prisma.weddingVenue.findFirst({
      where: { id: venueId, weddingInvitationId: invitationId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Venue not found.' });
      return;
    }

    await prisma.weddingVenue.delete({ where: { id: venueId } });

    res.status(200).json({
      success: true,
      message: 'Venue removed successfully.',
    });
  } catch (error) {
    console.error('Delete venue error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete venue.' });
  }
};

/**
 * Manage Events
 */
export const addEvent = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { invitationId } = req.params;
    const {
      titleEn,
      titleMl,
      eventType,
      descriptionEn,
      descriptionMl,
      startTime,
      endTime,
      dressCodeEn,
      dressCodeMl,
      venueId,
      sortOrder,
    } = req.body;

    if (!titleEn || !startTime) {
      res.status(400).json({
        success: false,
        message: 'Event title (English) and start time are required.',
      });
      return;
    }

    const event = await prisma.weddingEvent.create({
      data: {
        weddingInvitationId: invitationId,
        venueId: venueId || null,
        titleEn: titleEn.trim(),
        titleMl: titleMl ? titleMl.trim() : null,
        eventType: eventType ? eventType.trim() : null,
        descriptionEn: descriptionEn ? descriptionEn.trim() : null,
        descriptionMl: descriptionMl ? descriptionMl.trim() : null,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        dressCodeEn: dressCodeEn ? dressCodeEn.trim() : null,
        dressCodeMl: dressCodeMl ? dressCodeMl.trim() : null,
        sortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
      },
      include: { venue: true },
    });

    res.status(201).json({
      success: true,
      message: 'Ceremony event added successfully.',
      data: { event },
    });
  } catch (error) {
    console.error('Add event error:', error);
    res.status(500).json({ success: false, message: 'Failed to add ceremony event.' });
  }
};

export const updateEvent = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { invitationId, eventId } = req.params;
    const {
      titleEn,
      titleMl,
      eventType,
      descriptionEn,
      descriptionMl,
      startTime,
      endTime,
      dressCodeEn,
      dressCodeMl,
      venueId,
      sortOrder,
    } = req.body;

    const existing = await prisma.weddingEvent.findFirst({
      where: { id: eventId, weddingInvitationId: invitationId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Ceremony event not found.' });
      return;
    }

    const updated = await prisma.weddingEvent.update({
      where: { id: eventId },
      data: {
        titleEn: titleEn ? titleEn.trim() : existing.titleEn,
        titleMl: titleMl !== undefined ? (titleMl ? titleMl.trim() : null) : existing.titleMl,
        eventType: eventType !== undefined ? (eventType ? eventType.trim() : null) : existing.eventType,
        descriptionEn: descriptionEn !== undefined ? (descriptionEn ? descriptionEn.trim() : null) : existing.descriptionEn,
        descriptionMl: descriptionMl !== undefined ? (descriptionMl ? descriptionMl.trim() : null) : existing.descriptionMl,
        startTime: startTime ? new Date(startTime) : existing.startTime,
        endTime: endTime !== undefined ? (endTime ? new Date(endTime) : null) : existing.endTime,
        dressCodeEn: dressCodeEn !== undefined ? (dressCodeEn ? dressCodeEn.trim() : null) : existing.dressCodeEn,
        dressCodeMl: dressCodeMl !== undefined ? (dressCodeMl ? dressCodeMl.trim() : null) : existing.dressCodeMl,
        venueId: venueId !== undefined ? (venueId ? venueId : null) : existing.venueId,
        sortOrder: typeof sortOrder === 'number' ? sortOrder : existing.sortOrder,
      },
      include: { venue: true },
    });

    res.status(200).json({
      success: true,
      message: 'Ceremony event updated successfully.',
      data: { event: updated },
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ success: false, message: 'Failed to update ceremony event.' });
  }
};

export const deleteEvent = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { invitationId, eventId } = req.params;

    const existing = await prisma.weddingEvent.findFirst({
      where: { id: eventId, weddingInvitationId: invitationId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Ceremony event not found.' });
      return;
    }

    await prisma.weddingEvent.delete({ where: { id: eventId } });

    res.status(200).json({
      success: true,
      message: 'Ceremony event removed successfully.',
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete ceremony event.' });
  }
};

/**
 * Delete a wedding invitation draft
 */
export const deleteWeddingInvitation = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { invitationId } = req.params;
    const ownerId = req.user?.id;

    const existing = await prisma.weddingInvitation.findFirst({
      where: { id: invitationId, ownerId },
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        message: 'Wedding invitation not found or access denied.',
      });
      return;
    }

    // Cascade delete via Prisma schema
    await prisma.weddingInvitation.delete({
      where: { id: invitationId },
    });

    res.status(200).json({
      success: true,
      message: `Wedding invitation "${existing.titleEn}" deleted successfully.`,
    });
  } catch (error) {
    console.error('Delete invitation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete wedding invitation.',
    });
  }
};
