import { Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import prisma from '../config/db';

// --- Validation ---

// Accept Indian mobile: 10 digits, optional +91 prefix, and reasonable international formats
const phoneRegex = /^(\+?\d{1,4}[\s-]?)?(\(?\d{1,5}\)?[\s-]?)?[\d\s-]{6,15}$/;

const rsvpSubmitSchema = z.object({
  guestName: z.string().trim().min(1, 'Guest name is required'),
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, 'Please provide a valid phone number'),
  email: z.string().email('Invalid email address').trim().optional().nullable().or(z.literal('')),
  status: z.enum(['ATTENDING', 'DECLINED'], {
    errorMap: () => ({ message: 'Please select whether you will attend or decline.' }),
  }),
  attendeeCount: z.number().int().min(0).max(20, 'Maximum 20 attendees per RSVP').optional().default(1),
  accompanyingNames: z.string().trim().max(500).optional().nullable().or(z.literal('')),
  dietaryPreferences: z.string().trim().max(300).optional().nullable().or(z.literal('')),
  message: z.string().trim().max(1000).optional().nullable().or(z.literal('')),
});

/**
 * Public RSVP submission — no auth required
 * Duplicate strategy: phone + weddingInvitationId as dedup key.
 * If a phone already submitted an RSVP for this wedding, UPDATE that record.
 */
export const submitPublicRsvp = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const slugRaw = (req.params.slug || '').trim().toLowerCase();

    if (!slugRaw) {
      res.status(400).json({ success: false, message: 'Invalid invitation slug.' });
      return;
    }

    // Look up invitation by slug
    const invitation = await prisma.weddingInvitation.findUnique({
      where: { slug: slugRaw },
      select: { id: true, isPublished: true },
    });

    if (!invitation) {
      res.status(404).json({ success: false, message: 'Wedding invitation not found.' });
      return;
    }

    if (!invitation.isPublished) {
      res.status(403).json({
        success: false,
        message: 'This wedding invitation is not yet published. RSVPs cannot be accepted.',
      });
      return;
    }

    // Validate body
    const parseResult = rsvpSubmitSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: parseResult.error.errors[0]?.message || 'Validation failed',
        errors: parseResult.error.format(),
      });
      return;
    }

    const data = parseResult.data;

    // Cross-validate attendeeCount vs status
    if (data.status === 'ATTENDING' && data.attendeeCount < 1) {
      res.status(400).json({
        success: false,
        message: 'When attending, the attendee count must be at least 1.',
      });
      return;
    }

    if (data.status === 'DECLINED') {
      data.attendeeCount = 0;
    }

    const normalizedPhone = data.phone.replace(/[\s-]/g, '');

    // Check for existing RSVP with same phone for this wedding (dedup)
    const existingRsvp = await prisma.guestRSVP.findFirst({
      where: {
        weddingInvitationId: invitation.id,
        phone: normalizedPhone,
      },
    });

    if (existingRsvp) {
      // Update existing RSVP
      const updatedRsvp = await prisma.guestRSVP.update({
        where: { id: existingRsvp.id },
        data: {
          guestName: data.guestName,
          guestContact: normalizedPhone,
          email: data.email || null,
          status: data.status,
          attendeeCount: data.attendeeCount,
          accompanyingNames: data.accompanyingNames || null,
          dietaryPreferences: data.dietaryPreferences || null,
          message: data.message || null,
          submittedAt: new Date(),
        },
        select: {
          editToken: true,
          status: true,
          attendeeCount: true,
          guestName: true,
        },
      });

      res.status(200).json({
        success: true,
        message: 'Your RSVP has been updated successfully.',
        data: {
          editToken: updatedRsvp.editToken,
          status: updatedRsvp.status,
          attendeeCount: updatedRsvp.attendeeCount,
          guestName: updatedRsvp.guestName,
          isUpdate: true,
        },
      });
      return;
    }

    // Generate cryptographically random edit token
    const editToken = crypto.randomBytes(32).toString('hex');

    // Try to link to an existing WeddingGuest by phone
    const matchedGuest = await prisma.weddingGuest.findFirst({
      where: {
        weddingInvitationId: invitation.id,
        phone: normalizedPhone,
      },
      select: { id: true },
    });

    const newRsvp = await prisma.guestRSVP.create({
      data: {
        weddingInvitationId: invitation.id,
        guestId: matchedGuest?.id || null,
        guestName: data.guestName,
        guestContact: normalizedPhone,
        phone: normalizedPhone,
        email: data.email || null,
        status: data.status,
        attendeeCount: data.attendeeCount,
        accompanyingNames: data.accompanyingNames || null,
        dietaryPreferences: data.dietaryPreferences || null,
        message: data.message || null,
        editToken,
      },
      select: {
        editToken: true,
        status: true,
        attendeeCount: true,
        guestName: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Your RSVP has been submitted successfully. Please save your edit token for future changes.',
      data: {
        editToken: newRsvp.editToken,
        status: newRsvp.status,
        attendeeCount: newRsvp.attendeeCount,
        guestName: newRsvp.guestName,
        isUpdate: false,
      },
    });
  } catch (error) {
    console.error('Submit public RSVP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit RSVP. Please try again.',
    });
  }
};

/**
 * Public RSVP update by edit token — no auth required
 */
export const updateRsvpByToken = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const editToken = (req.params.token || '').trim();

    if (!editToken || editToken.length < 32) {
      res.status(400).json({ success: false, message: 'Invalid edit token.' });
      return;
    }

    const existing = await prisma.guestRSVP.findUnique({
      where: { editToken },
      select: {
        id: true,
        weddingInvitationId: true,
        guestName: true,
        phone: true,
        email: true,
        status: true,
        attendeeCount: true,
        accompanyingNames: true,
        dietaryPreferences: true,
        message: true,
      },
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        message: 'RSVP not found. The edit token may be invalid or expired.',
      });
      return;
    }

    // Validate update body
    const parseResult = rsvpSubmitSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: parseResult.error.errors[0]?.message || 'Validation failed',
        errors: parseResult.error.format(),
      });
      return;
    }

    const data = parseResult.data;

    if (data.status === 'ATTENDING' && data.attendeeCount < 1) {
      res.status(400).json({
        success: false,
        message: 'When attending, the attendee count must be at least 1.',
      });
      return;
    }

    if (data.status === 'DECLINED') {
      data.attendeeCount = 0;
    }

    const updated = await prisma.guestRSVP.update({
      where: { editToken },
      data: {
        guestName: data.guestName,
        guestContact: data.phone.replace(/[\s-]/g, ''),
        phone: data.phone.replace(/[\s-]/g, ''),
        email: data.email || null,
        status: data.status,
        attendeeCount: data.attendeeCount,
        accompanyingNames: data.accompanyingNames || null,
        dietaryPreferences: data.dietaryPreferences || null,
        message: data.message || null,
        submittedAt: new Date(),
      },
      select: {
        editToken: true,
        status: true,
        attendeeCount: true,
        guestName: true,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Your RSVP has been updated successfully.',
      data: {
        editToken: updated.editToken,
        status: updated.status,
        attendeeCount: updated.attendeeCount,
        guestName: updated.guestName,
      },
    });
  } catch (error) {
    console.error('Update RSVP by token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update RSVP. Please try again.',
    });
  }
};

/**
 * Public GET to retrieve own RSVP by edit token (for pre-filling edit form)
 */
export const getRsvpByToken = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const editToken = (req.params.token || '').trim();

    if (!editToken || editToken.length < 32) {
      res.status(400).json({ success: false, message: 'Invalid edit token.' });
      return;
    }

    const rsvp = await prisma.guestRSVP.findUnique({
      where: { editToken },
      select: {
        guestName: true,
        phone: true,
        email: true,
        status: true,
        attendeeCount: true,
        accompanyingNames: true,
        dietaryPreferences: true,
        message: true,
        submittedAt: true,
      },
    });

    if (!rsvp) {
      res.status(404).json({
        success: false,
        message: 'RSVP not found.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { rsvp },
    });
  } catch (error) {
    console.error('Get RSVP by token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve RSVP.',
    });
  }
};
