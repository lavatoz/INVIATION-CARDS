import { Router } from 'express';
import {
  addGuest,
  updateGuest,
  deleteGuest,
  getGuests,
  getRsvps,
  getAttendanceStats,
  exportGuestsCsv,
  updateRsvpByOwner,
} from '../controllers/guestController';
import { authenticateToken, requireOwner, checkInvitationOwnership } from '../middleware/auth';

const router = Router();

// All guest management routes require auth + ownership
router.use(authenticateToken);
router.use(requireOwner);

// Guest CRUD
router.get('/invitations/:invitationId/guests', checkInvitationOwnership, getGuests);
router.post('/invitations/:invitationId/guests', checkInvitationOwnership, addGuest);
router.put('/invitations/:invitationId/guests/:guestId', checkInvitationOwnership, updateGuest);
router.delete('/invitations/:invitationId/guests/:guestId', checkInvitationOwnership, deleteGuest);

// RSVP management
router.get('/invitations/:invitationId/rsvps', checkInvitationOwnership, getRsvps);
router.put('/invitations/:invitationId/rsvps/:rsvpId', checkInvitationOwnership, updateRsvpByOwner);

// Statistics
router.get('/invitations/:invitationId/attendance', checkInvitationOwnership, getAttendanceStats);

// CSV Export
router.get('/invitations/:invitationId/export-csv', checkInvitationOwnership, exportGuestsCsv);

export default router;
