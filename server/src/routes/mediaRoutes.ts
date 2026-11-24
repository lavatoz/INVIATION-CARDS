import { Router } from 'express';
import {
  getOwnerMedia,
  uploadGalleryPhoto,
  replaceMediaPhoto,
  updateMedia,
  reorderMedia,
  deleteMedia,
} from '../controllers/mediaController';
import { authenticateToken, requireOwner, checkInvitationOwnership } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);
router.use(requireOwner);

router.get('/invitations/:invitationId/media', checkInvitationOwnership, getOwnerMedia);
router.post('/invitations/:invitationId/media', checkInvitationOwnership, uploadGalleryPhoto);
router.post('/invitations/:invitationId/media/reorder', checkInvitationOwnership, reorderMedia);
router.put('/invitations/:invitationId/media/:mediaId', checkInvitationOwnership, updateMedia);
router.put('/invitations/:invitationId/media/:mediaId/replace', checkInvitationOwnership, replaceMediaPhoto);
router.delete('/invitations/:invitationId/media/:mediaId', checkInvitationOwnership, deleteMedia);

export default router;
