import { Router } from 'express';
import {
  getOwnerSponsors,
  addSponsor,
  updateSponsor,
  deleteSponsor,
  reorderSponsors,
  uploadSponsorLogo,
} from '../controllers/sponsorController';
import { authenticateToken, requireOwner, checkInvitationOwnership } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);
router.use(requireOwner);

router.get('/invitations/:invitationId/sponsors', checkInvitationOwnership, getOwnerSponsors);
router.post('/invitations/:invitationId/sponsors', checkInvitationOwnership, addSponsor);
router.put('/invitations/:invitationId/sponsors/:sponsorId', checkInvitationOwnership, updateSponsor);
router.delete('/invitations/:invitationId/sponsors/:sponsorId', checkInvitationOwnership, deleteSponsor);
router.post('/invitations/:invitationId/sponsors/reorder', checkInvitationOwnership, reorderSponsors);
router.post('/invitations/:invitationId/sponsors/upload-logo', checkInvitationOwnership, uploadSponsorLogo);

export default router;
