import { Router } from 'express';
import {
  getGiftSettings,
  updateGiftSettings,
  getGiftContributions,
  reconcileContributionManual,
  flagContributionReview,
} from '../controllers/giftController';
import { authenticateToken, requireOwner, checkInvitationOwnership } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);
router.use(requireOwner);

router.get('/invitations/:invitationId/gifts/settings', checkInvitationOwnership, getGiftSettings);
router.put('/invitations/:invitationId/gifts/settings', checkInvitationOwnership, updateGiftSettings);
router.get('/invitations/:invitationId/gifts/contributions', checkInvitationOwnership, getGiftContributions);
router.post('/invitations/:invitationId/gifts/contributions/:contributionId/reconcile', checkInvitationOwnership, reconcileContributionManual);
router.post('/invitations/:invitationId/gifts/contributions/:contributionId/flag-review', checkInvitationOwnership, flagContributionReview);

export default router;
