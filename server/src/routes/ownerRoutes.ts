import { Router } from 'express';
import {
  checkSlug,
  createWeddingInvitation,
  getOwnerInvitations,
  getOwnerInvitationById,
  updateOverview,
  updateCoupleDetails,
  addFamilyMember,
  updateFamilyMember,
  deleteFamilyMember,
  addVenue,
  updateVenue,
  deleteVenue,
  addEvent,
  updateEvent,
  deleteEvent,
  deleteWeddingInvitation,
} from '../controllers/ownerController';
import { authenticateToken, requireOwner, checkInvitationOwnership } from '../middleware/auth';

const router = Router();

// All owner routes require valid token and owner role
router.use(authenticateToken);
router.use(requireOwner);

// Slug verification
router.get('/check-slug', checkSlug);

// Core invitations management
router.get('/invitations', getOwnerInvitations);
router.post('/invitations', createWeddingInvitation);
router.get('/invitations/:invitationId', checkInvitationOwnership, getOwnerInvitationById);
router.delete('/invitations/:invitationId', checkInvitationOwnership, deleteWeddingInvitation);

// Section-specific editor update routes
router.put('/invitations/:invitationId/overview', checkInvitationOwnership, updateOverview);
router.put('/invitations/:invitationId/couple', checkInvitationOwnership, updateCoupleDetails);

// Family members sub-resource
router.post('/invitations/:invitationId/family', checkInvitationOwnership, addFamilyMember);
router.put('/invitations/:invitationId/family/:memberId', checkInvitationOwnership, updateFamilyMember);
router.delete('/invitations/:invitationId/family/:memberId', checkInvitationOwnership, deleteFamilyMember);

// Venues sub-resource
router.post('/invitations/:invitationId/venues', checkInvitationOwnership, addVenue);
router.put('/invitations/:invitationId/venues/:venueId', checkInvitationOwnership, updateVenue);
router.delete('/invitations/:invitationId/venues/:venueId', checkInvitationOwnership, deleteVenue);

// Events sub-resource
router.post('/invitations/:invitationId/events', checkInvitationOwnership, addEvent);
router.put('/invitations/:invitationId/events/:eventId', checkInvitationOwnership, updateEvent);
router.delete('/invitations/:invitationId/events/:eventId', checkInvitationOwnership, deleteEvent);

export default router;
