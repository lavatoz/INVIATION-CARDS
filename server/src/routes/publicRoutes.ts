import { Router } from 'express';
import { getPublicInvitationBySlug, serveLocalMedia } from '../controllers/publicController';
import { submitPublicRsvp, updateRsvpByToken, getRsvpByToken } from '../controllers/publicRsvpController';
import {
  initiateGiftContribution,
  getContributionStatus,
  streamContributionStatus,
  handleYoupiWebhook,
  submitGuestUtr,
} from '../controllers/giftController';

const router = Router();

// Public invitation route (no auth required)
router.get('/invitations/:slug', getPublicInvitationBySlug);

// Public RSVP routes (no auth required)
router.post('/invitations/:slug/rsvp', submitPublicRsvp);
router.get('/rsvp/:token', getRsvpByToken);
router.put('/rsvp/:token', updateRsvpByToken);

// Public gift contribution routes (no auth required)
router.post('/invitations/:slug/gifts/initiate', initiateGiftContribution);
router.get('/contributions/:id/status', getContributionStatus);
router.get('/contributions/:id/status-stream', streamContributionStatus);
router.post('/contributions/:id/submit-utr', submitGuestUtr);

// Authoritative YouPI PG V2 Server-to-Server Webhook
router.post('/payments/youpi-webhook', handleYoupiWebhook);

// Public media safe route
router.get('/media/:fileName', serveLocalMedia);

export default router;
