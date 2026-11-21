import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

// --- Validation Schemas ---

const addGuestSchema = z.object({
  name: z.string().trim().min(1, 'Guest name is required'),
  phone: z.string().trim().optional().nullable(),
  email: z.string().email('Invalid email').trim().optional().nullable(),
  side: z.enum(['GROOM', 'BRIDE', 'BOTH']).optional().nullable(),
  guestGroup: z.string().trim().optional().nullable(),
  invitedCount: z.number().int().min(1).max(50).optional().default(1),
  notes: z.string().trim().optional().nullable(),
});

const updateGuestSchema = z.object({
  name: z.string().trim().min(1).optional(),
  phone: z.string().trim().optional().nullable(),
  email: z.string().email('Invalid email').trim().optional().nullable(),
  side: z.enum(['GROOM', 'BRIDE', 'BOTH']).optional().nullable(),
  guestGroup: z.string().trim().optional().nullable(),
  invitedCount: z.number().int().min(1).max(50).optional(),
  notes: z.string().trim().optional().nullable(),
});

// --- CSV Injection Protection ---
function sanitizeCsvCell(value: string): string {
  if (!value) return '';
  const dangerous = ['=', '+', '-', '@', '\t', '\r'];
  if (dangerous.some((ch) => value.startsWith(ch))) {
    return `'${value}`;
  }
  // Escape double quotes and wrap if contains comma, newline, or double-quote
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// --- Controller Actions ---

/**
 * Owner adds a guest to the invited list
 */
export const addGuest = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { invitationId } = req.params;

    const parseResult = addGuestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: parseResult.error.errors[0]?.message || 'Validation failed',
      });
      return;
    }

    const { name, phone, email, side, guestGroup, invitedCount, notes } = parseResult.data;

    const guest = await prisma.weddingGuest.create({
      data: {
        weddingInvitationId: invitationId,
        name,
        phone: phone || null,
        email: email || null,
        side: side || null,
        guestGroup: guestGroup || null,
        invitedCount,
        notes: notes || null,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Guest added to invitation list.',
      data: { guest },
    });
  } catch (error) {
    console.error('Add guest error:', error);
    res.status(500).json({ success: false, message: 'Failed to add guest.' });
  }
};

/**
 * Owner updates an existing guest
 */
export const updateGuest = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { invitationId, guestId } = req.params;

    const existing = await prisma.weddingGuest.findFirst({
      where: { id: guestId, weddingInvitationId: invitationId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Guest not found.' });
      return;
    }

    const parseResult = updateGuestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: parseResult.error.errors[0]?.message || 'Validation failed',
      });
      return;
    }

    const data = parseResult.data;

    const updated = await prisma.weddingGuest.update({
      where: { id: guestId },
      data: {
        name: data.name ?? existing.name,
        phone: data.phone !== undefined ? (data.phone || null) : existing.phone,
        email: data.email !== undefined ? (data.email || null) : existing.email,
        side: data.side !== undefined ? data.side : existing.side,
        guestGroup: data.guestGroup !== undefined ? (data.guestGroup || null) : existing.guestGroup,
        invitedCount: data.invitedCount ?? existing.invitedCount,
        notes: data.notes !== undefined ? (data.notes || null) : existing.notes,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Guest updated successfully.',
      data: { guest: updated },
    });
  } catch (error) {
    console.error('Update guest error:', error);
    res.status(500).json({ success: false, message: 'Failed to update guest.' });
  }
};

/**
 * Owner deletes a guest
 */
export const deleteGuest = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { invitationId, guestId } = req.params;

    const existing = await prisma.weddingGuest.findFirst({
      where: { id: guestId, weddingInvitationId: invitationId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Guest not found.' });
      return;
    }

    await prisma.weddingGuest.delete({ where: { id: guestId } });

    res.status(200).json({
      success: true,
      message: 'Guest removed successfully.',
    });
  } catch (error) {
    console.error('Delete guest error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete guest.' });
  }
};

/**
 * Owner lists guests for an invitation with optional search/filter
 */
export const getGuests = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { invitationId } = req.params;
    const search = (req.query.search as string || '').trim();
    const side = req.query.side as string | undefined;
    const rsvpStatus = req.query.rsvpStatus as string | undefined;

    const whereClause: any = { weddingInvitationId: invitationId };

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (side && ['GROOM', 'BRIDE', 'BOTH'].includes(side)) {
      whereClause.side = side;
    }

    const guests = await prisma.weddingGuest.findMany({
      where: whereClause,
      include: {
        rsvps: {
          select: {
            id: true,
            status: true,
            attendeeCount: true,
            guestName: true,
            submittedAt: true,
          },
          orderBy: { submittedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // If rsvpStatus filter is provided, filter in-memory
    let filtered = guests;
    if (rsvpStatus && ['ATTENDING', 'DECLINED', 'TENTATIVE', 'PENDING'].includes(rsvpStatus)) {
      if (rsvpStatus === 'PENDING') {
        filtered = guests.filter((g) => g.rsvps.length === 0 || g.rsvps[0].status === 'PENDING');
      } else {
        filtered = guests.filter((g) => g.rsvps.length > 0 && g.rsvps[0].status === rsvpStatus);
      }
    }

    res.status(200).json({
      success: true,
      data: { guests: filtered, total: filtered.length },
    });
  } catch (error) {
    console.error('Get guests error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve guests.' });
  }
};

/**
 * Owner lists all RSVP submissions for an invitation
 */
export const getRsvps = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { invitationId } = req.params;

    const rsvps = await prisma.guestRSVP.findMany({
      where: { weddingInvitationId: invitationId },
      include: {
        guest: {
          select: { id: true, name: true, side: true, guestGroup: true },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: { rsvps, total: rsvps.length },
    });
  } catch (error) {
    console.error('Get RSVPs error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve RSVPs.' });
  }
};

/**
 * Owner views attendance statistics
 */
export const getAttendanceStats = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { invitationId } = req.params;

    // Get all guests
    const guests = await prisma.weddingGuest.findMany({
      where: { weddingInvitationId: invitationId },
      select: { id: true, invitedCount: true, side: true },
    });

    // Get all RSVPs
    const rsvps = await prisma.guestRSVP.findMany({
      where: { weddingInvitationId: invitationId },
      select: {
        id: true,
        status: true,
        attendeeCount: true,
        guestId: true,
        guest: { select: { side: true } },
      },
    });

    const totalInvitedGuests = guests.length;
    const totalInvitedPeople = guests.reduce((sum, g) => sum + g.invitedCount, 0);

    const confirmedRsvps = rsvps.filter((r) => r.status === 'ATTENDING');
    const declinedRsvps = rsvps.filter((r) => r.status === 'DECLINED');
    const tentativeRsvps = rsvps.filter((r) => r.status === 'TENTATIVE');
    const pendingRsvps = rsvps.filter((r) => r.status === 'PENDING');

    const totalConfirmedAttendees = confirmedRsvps.reduce((sum, r) => sum + r.attendeeCount, 0);

    // Family-wise breakdown
    const groomSideGuests = guests.filter((g) => g.side === 'GROOM');
    const brideSideGuests = guests.filter((g) => g.side === 'BRIDE');

    const groomSideGuestIds = new Set(groomSideGuests.map((g) => g.id));
    const brideSideGuestIds = new Set(brideSideGuests.map((g) => g.id));

    const groomSideConfirmed = confirmedRsvps.filter(
      (r) => r.guestId && groomSideGuestIds.has(r.guestId)
    );
    const brideSideConfirmed = confirmedRsvps.filter(
      (r) => r.guestId && brideSideGuestIds.has(r.guestId)
    );

    const groomSideAttendees = groomSideConfirmed.reduce((sum, r) => sum + r.attendeeCount, 0);
    const brideSideAttendees = brideSideConfirmed.reduce((sum, r) => sum + r.attendeeCount, 0);

    // RSVPs without a linked guest (public submissions)
    const unlinkedConfirmed = confirmedRsvps.filter((r) => !r.guestId);
    const unlinkedAttendees = unlinkedConfirmed.reduce((sum, r) => sum + r.attendeeCount, 0);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalInvitedGuests,
          totalInvitedPeople,
          totalRsvps: rsvps.length,
          confirmed: confirmedRsvps.length,
          totalConfirmedAttendees,
          declined: declinedRsvps.length,
          tentative: tentativeRsvps.length,
          pending: pendingRsvps.length + (totalInvitedGuests - rsvps.length),
          familyWise: {
            groom: {
              invitedGuests: groomSideGuests.length,
              invitedPeople: groomSideGuests.reduce((sum, g) => sum + g.invitedCount, 0),
              confirmedRsvps: groomSideConfirmed.length,
              confirmedAttendees: groomSideAttendees,
            },
            bride: {
              invitedGuests: brideSideGuests.length,
              invitedPeople: brideSideGuests.reduce((sum, g) => sum + g.invitedCount, 0),
              confirmedRsvps: brideSideConfirmed.length,
              confirmedAttendees: brideSideAttendees,
            },
            unlinked: {
              confirmedRsvps: unlinkedConfirmed.length,
              confirmedAttendees: unlinkedAttendees,
            },
          },
        },
      },
    });
  } catch (error) {
    console.error('Get attendance stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to compute attendance statistics.' });
  }
};

/**
 * Owner exports guest data as CSV
 */
export const exportGuestsCsv = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { invitationId } = req.params;

    const guests = await prisma.weddingGuest.findMany({
      where: { weddingInvitationId: invitationId },
      include: {
        rsvps: {
          orderBy: { submittedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });

    const headers = [
      'Guest Name',
      'Phone',
      'Email',
      'Side',
      'Group',
      'Invited Count',
      'RSVP Status',
      'Attending Count',
      'Dietary Preferences',
      'Message',
      'RSVP Date',
      'Notes',
    ];

    const rows = guests.map((g) => {
      const rsvp = g.rsvps[0];
      return [
        sanitizeCsvCell(g.name),
        sanitizeCsvCell(g.phone || ''),
        sanitizeCsvCell(g.email || ''),
        sanitizeCsvCell(g.side || ''),
        sanitizeCsvCell(g.guestGroup || ''),
        String(g.invitedCount),
        sanitizeCsvCell(rsvp?.status || 'NO_RSVP'),
        String(rsvp?.attendeeCount || 0),
        sanitizeCsvCell(rsvp?.dietaryPreferences || ''),
        sanitizeCsvCell(rsvp?.message || ''),
        rsvp?.submittedAt ? new Date(rsvp.submittedAt).toISOString() : '',
        sanitizeCsvCell(g.notes || ''),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="guests-${invitationId}.csv"`);
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ success: false, message: 'Failed to export guest data.' });
  }
};

/**
 * Owner updates/corrects an RSVP record
 */
export const updateRsvpByOwner = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { invitationId, rsvpId } = req.params;

    const existing = await prisma.guestRSVP.findFirst({
      where: { id: rsvpId, weddingInvitationId: invitationId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'RSVP record not found.' });
      return;
    }

    const { status, attendeeCount, dietaryPreferences, message, accompanyingNames } = req.body;

    const updated = await prisma.guestRSVP.update({
      where: { id: rsvpId },
      data: {
        status: status || existing.status,
        attendeeCount: typeof attendeeCount === 'number' ? attendeeCount : existing.attendeeCount,
        dietaryPreferences: dietaryPreferences !== undefined ? dietaryPreferences : existing.dietaryPreferences,
        message: message !== undefined ? message : existing.message,
        accompanyingNames: accompanyingNames !== undefined ? accompanyingNames : existing.accompanyingNames,
      },
    });

    res.status(200).json({
      success: true,
      message: 'RSVP record updated by owner.',
      data: { rsvp: updated },
    });
  } catch (error) {
    console.error('Update RSVP by owner error:', error);
    res.status(500).json({ success: false, message: 'Failed to update RSVP record.' });
  }
};
