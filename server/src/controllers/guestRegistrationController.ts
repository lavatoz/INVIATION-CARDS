import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

// Indian & international phone regex (flexible for spaces, hyphens, optional country code)
const phoneRegex = /^(\+?\d{1,4}[\s-]?)?(\(?\d{1,5}\)?[\s-]?)?[\d\s-]{6,15}$/;

// --- Public Registration Schema ---
const publicGuestRegistrationSchema = z.object({
  fullName: z
    .string({ required_error: 'Full name is required' })
    .trim()
    .min(1, 'Name cannot be empty')
    .max(120, 'Name must be 120 characters or fewer'),
  address: z
    .string()
    .trim()
    .max(300, 'Address must be 300 characters or fewer')
    .optional()
    .nullable()
    .or(z.literal('')),
  mobileNumber: z
    .string()
    .trim()
    .max(25, 'Mobile number must be 25 characters or fewer')
    .optional()
    .nullable()
    .or(z.literal(''))
    .refine(
      (val) => !val || phoneRegex.test(val),
      'Please enter a valid mobile number'
    ),
  side: z.enum(['BRIDE', 'GROOM'], {
    errorMap: () => ({ message: "Please specify whether you are joining from Bride's side or Groom's side." }),
  }),
  note: z
    .string()
    .trim()
    .max(1000, 'Note cannot exceed 1,000 characters')
    .optional()
    .nullable()
    .or(z.literal('')),
});

// Basic in-memory rate limiting map: IP -> timestamp array
const registrationRateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_REGISTRATIONS_PER_WINDOW = 15; // Max 15 submissions per 5 min per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (registrationRateLimitMap.get(ip) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  if (timestamps.length >= MAX_REGISTRATIONS_PER_WINDOW) {
    return true;
  }
  timestamps.push(now);
  registrationRateLimitMap.set(ip, timestamps);
  return false;
}

// Clean dangerous characters / script tags from input
function sanitizeText(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim();
}

// Prevent CSV Injection formulas (=, +, -, @)
function sanitizeCsvCell(value: string | null | undefined): string {
  if (!value) return '';
  const str = String(value).trim();
  const dangerous = ['=', '+', '-', '@', '\t', '\r'];
  let safe = str;
  if (dangerous.some((ch) => str.startsWith(ch))) {
    safe = `'${str}`;
  }
  if (safe.includes(',') || safe.includes('\n') || safe.includes('"')) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

/**
 * Public guest registration submission (No auth required)
 * STRICT PRIVACY: Returns only confirmation message. Never leaks counts or other guests.
 */
export const registerGuestPublic = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const rawSlug = (req.params.slug || '').trim().toLowerCase();

    if (!rawSlug) {
      res.status(400).json({
        success: false,
        message: 'Invalid invitation slug.',
      });
      return;
    }

    // Rate limiting check
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    if (isRateLimited(clientIp)) {
      res.status(429).json({
        success: false,
        message: 'Too many submissions from this device. Please wait a few moments before trying again.',
      });
      return;
    }

    // Find invitation
    const invitation = await prisma.weddingInvitation.findUnique({
      where: { slug: rawSlug },
      select: { id: true, isPublished: true },
    });

    if (!invitation) {
      res.status(404).json({
        success: false,
        message: 'Wedding invitation not found.',
      });
      return;
    }

    if (!invitation.isPublished) {
      res.status(403).json({
        success: false,
        message: 'This wedding invitation is not yet published. Registration is not open.',
      });
      return;
    }

    // Validate payload
    const parseResult = publicGuestRegistrationSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: parseResult.error.errors[0]?.message || 'Validation failed',
        errors: parseResult.error.format(),
      });
      return;
    }

    const { fullName, address, mobileNumber, side, note } = parseResult.data;

    // Create record with sanitized text
    await prisma.guestRegistration.create({
      data: {
        invitationId: invitation.id,
        fullName: sanitizeText(fullName),
        address: address ? sanitizeText(address) : null,
        mobileNumber: mobileNumber ? sanitizeText(mobileNumber) : null,
        side,
        note: note ? sanitizeText(note) : null,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Thank you for sharing your details! Your response has been warmly received.',
    });
  } catch (error) {
    console.error('Public guest registration error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while submitting your response. Please try again.',
    });
  }
};

/**
 * Owner: Get registered guests with counts & complete details
 * Auth & invitation ownership strictly enforced via middleware
 */
export const getGuestRegistrations = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { invitationId } = req.params;

    // Run parallel count queries and list query
    const [total, brideCount, groomCount, registrations] = await Promise.all([
      prisma.guestRegistration.count({
        where: { invitationId },
      }),
      prisma.guestRegistration.count({
        where: { invitationId, side: 'BRIDE' },
      }),
      prisma.guestRegistration.count({
        where: { invitationId, side: 'GROOM' },
      }),
      prisma.guestRegistration.findMany({
        where: { invitationId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          address: true,
          mobileNumber: true,
          side: true,
          note: true,
          createdAt: true,
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          total,
          brideCount,
          groomCount,
        },
        registrations,
      },
    });
  } catch (error) {
    console.error('Get guest registrations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve registered guests.',
    });
  }
};

/**
 * Owner: Delete a registered guest record
 */
export const deleteGuestRegistration = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { invitationId, registrationId } = req.params;

    const existing = await prisma.guestRegistration.findFirst({
      where: {
        id: registrationId,
        invitationId,
      },
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        message: 'Guest registration record not found.',
      });
      return;
    }

    await prisma.guestRegistration.delete({
      where: { id: registrationId },
    });

    res.status(200).json({
      success: true,
      message: 'Guest registration deleted successfully.',
    });
  } catch (error) {
    console.error('Delete guest registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete guest registration.',
    });
  }
};

/**
 * Owner: Export registered guests to CSV
 */
export const exportGuestRegistrationsCsv = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { invitationId } = req.params;

    const registrations = await prisma.guestRegistration.findMany({
      where: { invitationId },
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['Full Name', 'Joining Side', 'Mobile Number', 'Address', 'Note for Couple', 'Registration Date'];
    const rows = registrations.map((r) => [
      sanitizeCsvCell(r.fullName),
      r.side === 'BRIDE' ? "Bride's Side" : "Groom's Side",
      sanitizeCsvCell(r.mobileNumber),
      sanitizeCsvCell(r.address),
      sanitizeCsvCell(r.note),
      sanitizeCsvCell(r.createdAt.toISOString()),
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="registered-guests-${invitationId}.csv"`);
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('Export registered guests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export registered guests to CSV.',
    });
  }
};
