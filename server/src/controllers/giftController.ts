import { Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { youpiService, isValidVpa } from '../services/youpiService';
import { sseService } from '../services/sseService';
import { env } from '../config/env';

const updateGiftSettingsSchema = z.object({
  enableGifts: z.boolean(),
  giftHeadingEn: z.string().trim().optional().nullable(),
  giftHeadingMl: z.string().trim().optional().nullable(),
  giftIntroEn: z.string().trim().optional().nullable(),
  giftIntroMl: z.string().trim().optional().nullable(),
  suggestedGiftAmounts: z.string().trim().optional().nullable(),
  paymentConfig: z.record(z.any()).optional().nullable(),
});

const initiateContributionSchema = z.object({
  contributorName: z.string().trim().min(1, 'Name is required'),
  contributorEmail: z.string().email('Invalid email').trim().optional().nullable().or(z.literal('')),
  contributorPhone: z.string().trim().optional().nullable().or(z.literal('')),
  amount: z.number().positive('Amount must be greater than zero').max(500000, 'Amount cannot exceed ₹5,00,000'),
  wishes: z.string().trim().max(1000).optional().nullable().or(z.literal('')),
});

const manualReconciliationSchema = z.object({
  utr: z.string().trim().min(6, 'Valid 12-digit or bank UTR reference is required'),
  verificationNotes: z.string().trim().max(1000).optional().nullable(),
});

const flagReviewSchema = z.object({
  status: z.enum(['MANUAL_REVIEW', 'FAILED']),
  notes: z.string().trim().max(1000).optional().nullable(),
});

/**
 * Owner: Get gift settings, detailed status totals, and gateway configuration
 */
export const getGiftSettings = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { invitationId } = req.params;

    const invitation = await prisma.weddingInvitation.findUnique({
      where: { id: invitationId },
      select: {
        id: true,
        slug: true,
        enableGifts: true,
        giftHeadingEn: true,
        giftHeadingMl: true,
        giftIntroEn: true,
        giftIntroMl: true,
        suggestedGiftAmounts: true,
        paymentConfig: true,
      },
    });

    if (!invitation) {
      res.status(404).json({ success: false, message: 'Invitation not found.' });
      return;
    }

    const contributions = await prisma.giftContribution.findMany({
      where: { weddingInvitationId: invitationId },
      include: {
        paymentTransaction: {
          select: {
            id: true,
            status: true,
            settlementState: true,
            amount: true,
            paidAt: true,
            utr: true,
            orderId: true,
          },
        },
      },
    });

    // Accounting rules:
    // 1. ONLY RECONCILED (and legacy SUCCESS) are counted in confirmed totals.
    // 2. OBSERVED_SUCCESS is kept separate as unreconciled observation.
    // 3. PENDING and CREATED are pending.
    // 4. MANUAL_REVIEW is held for human checking.
    // 5. FAILED and EXPIRED are tracked separately.

    let reconciledTotal = 0;
    let reconciledCount = 0;
    let pendingTotal = 0;
    let pendingCount = 0;
    let observedTotal = 0;
    let observedCount = 0;
    let manualReviewTotal = 0;
    let manualReviewCount = 0;
    let failedOrExpiredCount = 0;

    for (const c of contributions) {
      const status = c.paymentTransaction?.status;
      const amount = Number(c.amount);

      switch (status) {
        case 'RECONCILED':
        case 'SUCCESS':
          reconciledTotal += amount;
          reconciledCount++;
          break;
        case 'OBSERVED_SUCCESS':
          observedTotal += amount;
          observedCount++;
          break;
        case 'MANUAL_REVIEW':
          manualReviewTotal += amount;
          manualReviewCount++;
          break;
        case 'FAILED':
        case 'EXPIRED':
          failedOrExpiredCount++;
          break;
        default:
          pendingTotal += amount;
          pendingCount++;
          break;
      }
    }

    const paymentConfig = (invitation.paymentConfig as any) || {};
    const upiId = (paymentConfig.upiId || '').trim();
    const isVpaValid = isValidVpa(upiId);
    const isYoupi = paymentConfig.provider === 'youpi';
    const isGatewayConfigured = Boolean(
      paymentConfig.isConfigured &&
      isVpaValid &&
      (isYoupi ? youpiService.isEnabled() : true)
    );

    res.status(200).json({
      success: true,
      data: {
        settings: {
          ...invitation,
          suggestedAmounts: (invitation.suggestedGiftAmounts || '200,500,2000')
            .split(',')
            .map((s) => parseInt(s.trim(), 10))
            .filter((n) => !isNaN(n) && n > 0),
          isGatewayConfigured,
          receivingVpa: upiId || null,
          isVpaValid,
          youpiServerEnabled: youpiService.isEnabled(),
          accountHolderAuthorized: Boolean(env.YOUPI_ACCOUNT_HOLDER_CONSENT),
          receivingAccountHolder: env.YOUPI_RECEIVING_ACCOUNT_HOLDER || paymentConfig.payeeName || 'Not Set',
        },
        totals: {
          totalContributions: contributions.length,
          verifiedContributions: reconciledCount,
          verifiedAmount: reconciledTotal,
          // Granular separate accounting breakdown
          reconciledContributions: reconciledCount,
          reconciledAmount: reconciledTotal,
          observedContributions: observedCount,
          observedAmount: observedTotal,
          pendingContributions: pendingCount,
          pendingAmount: pendingTotal,
          manualReviewContributions: manualReviewCount,
          manualReviewAmount: manualReviewTotal,
          failedOrExpiredCount,
        },
      },
    });
  } catch (error) {
    console.error('Get gift settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve gift settings.' });
  }
};

/**
 * Owner: Update gift configuration & payment settings
 */
export const updateGiftSettings = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { invitationId } = req.params;

    const parseResult = updateGiftSettingsSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: parseResult.error.errors[0]?.message || 'Validation failed',
      });
      return;
    }

    const data = parseResult.data;

    // Validate UPI VPA if payments are enabled
    if (data.paymentConfig && data.paymentConfig.isConfigured) {
      const upiId = (data.paymentConfig.upiId || '').trim();
      if (!isValidVpa(upiId)) {
        res.status(400).json({
          success: false,
          message: `Invalid receiving UPI VPA: "${upiId}". A valid UPI ID format is required (e.g. name@bank or name@okhdfcbank) so guests can complete payments across all UPI apps.`,
        });
        return;
      }
    }

    const updated = await prisma.weddingInvitation.update({
      where: { id: invitationId },
      data: {
        enableGifts: data.enableGifts,
        giftHeadingEn: data.giftHeadingEn !== undefined ? data.giftHeadingEn : undefined,
        giftHeadingMl: data.giftHeadingMl !== undefined ? data.giftHeadingMl : undefined,
        giftIntroEn: data.giftIntroEn !== undefined ? (data.giftIntroEn || null) : undefined,
        giftIntroMl: data.giftIntroMl !== undefined ? (data.giftIntroMl || null) : undefined,
        suggestedGiftAmounts: data.suggestedGiftAmounts !== undefined ? (data.suggestedGiftAmounts || '200,500,2000') : undefined,
        paymentConfig: data.paymentConfig !== undefined ? (data.paymentConfig === null ? Prisma.JsonNull : data.paymentConfig) : undefined,
      },
      select: {
        id: true,
        enableGifts: true,
        giftHeadingEn: true,
        giftHeadingMl: true,
        giftIntroEn: true,
        giftIntroMl: true,
        suggestedGiftAmounts: true,
        paymentConfig: true,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Gift contribution settings updated successfully.',
      data: { settings: updated },
    });
  } catch (error) {
    console.error('Update gift settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to update gift settings.' });
  }
};

/**
 * Owner: List contribution history with full reconciliation metadata
 */
export const getGiftContributions = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { invitationId } = req.params;

    const contributions = await prisma.giftContribution.findMany({
      where: { weddingInvitationId: invitationId },
      include: {
        paymentTransaction: {
          select: {
            id: true,
            transactionReference: true,
            orderId: true,
            gateway: true,
            status: true,
            settlementState: true,
            amount: true,
            currency: true,
            paidAt: true,
            utr: true,
            checkoutUrl: true,
            reconciledAt: true,
            reconciledBy: true,
            verificationNotes: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: { contributions, total: contributions.length },
    });
  } catch (error) {
    console.error('Get gift contributions error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve gift contributions.' });
  }
};

/**
 * Public: Initiate a gift contribution and generate live YouPI PG session or UPI checkout
 */
export const initiateGiftContribution = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const slug = (req.params.slug || '').trim().toLowerCase();

    const invitation = await prisma.weddingInvitation.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        titleEn: true,
        isPublished: true,
        enableGifts: true,
        paymentConfig: true,
      },
    });

    if (!invitation || !invitation.isPublished) {
      res.status(404).json({
        success: false,
        message: 'Wedding invitation not found or unpublished.',
      });
      return;
    }

    if (!invitation.enableGifts) {
      res.status(403).json({
        success: false,
        message: 'Gift contributions are not enabled for this wedding.',
      });
      return;
    }

    const parseResult = initiateContributionSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: parseResult.error.errors[0]?.message || 'Validation failed',
      });
      return;
    }

    const data = parseResult.data;
    const paymentConfig = (invitation.paymentConfig as any) || {};
    const upiId = (paymentConfig.upiId || '').trim();
    const payeeName = (paymentConfig.payeeName || invitation.titleEn || 'Wedding Couple').trim();
    const isVpaValid = isValidVpa(upiId);
    const isYoupi = paymentConfig.provider === 'youpi';
    const isGatewayConfigured = Boolean(
      paymentConfig.isConfigured &&
      isVpaValid &&
      (isYoupi ? youpiService.isEnabled() : true)
    );

    if (!isGatewayConfigured) {
      res.status(200).json({
        success: true,
        gatewayConfigured: false,
        message:
          'Online payment gateway receiving account (UPI ID) is currently being configured by the wedding hosts. Please convey your blessings directly or check back shortly.',
      });
      return;
    }

    // Unique order ID and transaction reference per transaction
    const orderId = `ORD-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const transactionRef = `TXN_${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

    // Create session via YouPI PG adapter if provider is YouPI
    let sessionData: any = null;
    let upiUri = '';
    let checkoutUrl = '';

    if (isYoupi) {
      try {
        sessionData = await youpiService.createPaymentSession({
          orderId,
          amount: data.amount,
          currency: 'INR',
          guestName: data.contributorName,
          guestEmail: data.contributorEmail,
          guestPhone: data.contributorPhone,
          weddingId: invitation.id,
          contributionId: '', // Filled in transaction
          weddingSlug: invitation.slug,
          upiId,
          payeeName,
        });

        upiUri = sessionData.upiUri;
        checkoutUrl = sessionData.checkoutUrl;
      } catch (youpiErr: any) {
        console.error('YouPI session creation error:', youpiErr.message);
        res.status(400).json({
          success: false,
          message: youpiErr.message || 'Failed to initialize YouPI payment session.',
        });
        return;
      }
    } else {
      // Standard NPCI-compliant UPI intent
      upiUri = youpiService.buildUpiIntentUri({
        upiId,
        payeeName,
        amount: data.amount,
        orderId,
      });
    }

    // Store records in PostgreSQL with transaction safety
    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.paymentTransaction.create({
        data: {
          weddingInvitationId: invitation.id,
          transactionReference: transactionRef,
          orderId,
          gateway: isYoupi ? 'YOUPI_PG_V2' : (paymentConfig.provider || 'UPI_GATEWAY'),
          status: 'PENDING',
          settlementState: 'NOT_RECONCILED',
          amount: data.amount,
          currency: 'INR',
          gatewayPaymentId: sessionData?.paymentId || null,
          checkoutUrl: checkoutUrl || null,
          upiQrString: upiUri,
        },
      });

      const contribution = await tx.giftContribution.create({
        data: {
          weddingInvitationId: invitation.id,
          contributorName: data.contributorName,
          contributorEmail: data.contributorEmail || null,
          contributorPhone: data.contributorPhone || null,
          amount: data.amount,
          currency: 'INR',
          wishes: data.wishes || null,
          paymentTransactionId: transaction.id,
        },
      });

      return { transaction, contribution };
    });

    res.status(201).json({
      success: true,
      gatewayConfigured: true,
      message: 'Gift contribution initiated. Awaiting UPI transfer.',
      data: {
        contributionId: result.contribution.id,
        orderId: result.transaction.orderId,
        transactionReference: result.transaction.transactionReference,
        amount: Number(result.transaction.amount),
        currency: result.transaction.currency,
        status: result.transaction.status,
        checkoutUrl: result.transaction.checkoutUrl,
        upiUri: result.transaction.upiQrString,
        payeeVpa: upiId,
        payeeName,
        streamUrl: `/api/public/contributions/${result.contribution.id}/status-stream`,
        statusUrl: `/api/public/contributions/${result.contribution.id}/status`,
      },
    });
  } catch (error) {
    console.error('Initiate gift contribution error:', error);
    res.status(500).json({ success: false, message: 'Failed to process contribution.' });
  }
};

/**
 * Public: Poll payment status for a contribution
 */
export const getContributionStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const contribution = await prisma.giftContribution.findUnique({
      where: { id },
      include: {
        paymentTransaction: true,
      },
    });

    if (!contribution || !contribution.paymentTransaction) {
      res.status(404).json({ success: false, message: 'Contribution record not found.' });
      return;
    }

    const tx = contribution.paymentTransaction;

    // Build user-friendly message based on strict state machine
    let userMessage = 'Waiting for payment';
    if (tx.status === 'OBSERVED_SUCCESS') {
      userMessage = 'Payment notification received, checking bank records';
    } else if (tx.status === 'RECONCILED') {
      userMessage = 'Payment reconciled';
    } else if (tx.status === 'MANUAL_REVIEW') {
      userMessage = 'Payment requires manual verification';
    } else if (tx.status === 'FAILED') {
      userMessage = 'Payment failed';
    } else if (tx.status === 'EXPIRED') {
      userMessage = 'Checkout expired';
    }

    res.status(200).json({
      success: true,
      data: {
        contributionId: contribution.id,
        orderId: tx.orderId,
        status: tx.status,
        settlementState: tx.settlementState,
        amount: Number(tx.amount),
        currency: tx.currency,
        utr: tx.utr,
        paidAt: tx.paidAt,
        message: userMessage,
      },
    });
  } catch (error) {
    console.error('Get contribution status error:', error);
    res.status(500).json({ success: false, message: 'Failed to get payment status.' });
  }
};

/**
 * Public: Server-Sent Events (SSE) stream for real-time payment status
 */
export const streamContributionStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const contribution = await prisma.giftContribution.findUnique({
      where: { id },
      include: { paymentTransaction: true },
    });

    if (!contribution || !contribution.paymentTransaction) {
      res.status(404).json({ success: false, message: 'Contribution record not found.' });
      return;
    }

    const tx = contribution.paymentTransaction;
    const orderId = tx.orderId || tx.transactionReference;

    // Register connection with SSE service
    sseService.registerClient(orderId, contribution.id, res);

    // Immediately emit current state
    sseService.broadcastStatus(orderId, {
      status: tx.status,
      settlementState: tx.settlementState,
      utr: tx.utr,
      amount: Number(tx.amount),
    });
  } catch (error) {
    console.error('SSE connection error:', error);
    res.status(500).end();
  }
};

/**
 * Public Webhook: Authoritative server-to-server webhook handler for YouPI PG V2
 * Invariants:
 * - HMAC-SHA256 signature verification over raw request body
 * - Constant-time comparison
 * - Delivery ID deduplication (at-most-once state execution)
 * - Replay protection
 * - Order and Amount validation
 * - OBSERVED_SUCCESS is never automatically promoted to RECONCILED
 */
export const handleYoupiWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const signatureHeader = (req.headers['x-gateway-signature'] || '') as string;
    const deliveryId = (req.headers['x-gateway-delivery-id'] || '') as string;
    const timestampHeader = (req.headers['x-gateway-timestamp'] || '') as string;

    const rawBody = (req as any).rawBody || Buffer.from(JSON.stringify(req.body));

    // 1. Signature Verification
    const verification = youpiService.verifyWebhookSignature(rawBody, signatureHeader, timestampHeader);
    if (!verification.isValid || !verification.payload) {
      console.warn('YouPI Webhook signature rejected:', verification.error);
      res.status(401).json({ error: verification.error || 'Invalid webhook signature' });
      return;
    }

    // 2. Delivery ID Deduplication
    if (deliveryId) {
      const existingDelivery = await prisma.webhookDelivery.findUnique({
        where: { deliveryId },
      });

      if (existingDelivery) {
        // Return 200 idempotently
        res.status(200).json({ received: true, deduplicated: true });
        return;
      }
    }

    const payload = verification.payload;
    const { event, orderId, utr, amount, amountPaise } = payload;

    if (!orderId) {
      res.status(400).json({ error: 'Missing orderId in webhook payload' });
      return;
    }

    // 3. Find matching payment transaction
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { orderId },
      include: { giftContribution: true },
    });

    if (!transaction) {
      console.warn(`Webhook received for unknown orderId: ${orderId}`);
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    // 4. Amount Verification
    const expectedAmountPaise = Math.round(Number(transaction.amount) * 100);
    const receivedAmountPaise = amountPaise !== undefined ? Number(amountPaise) : Math.round(parseFloat(amount || '0') * 100);

    if (receivedAmountPaise !== expectedAmountPaise) {
      console.error(`Amount mismatch for order ${orderId}: expected ${expectedAmountPaise} paise, received ${receivedAmountPaise} paise`);

      // Flag transaction for manual review due to security mismatch
      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'MANUAL_REVIEW',
          settlementState: 'AMOUNT_MISMATCH',
          verificationNotes: `Flagged: Amount mismatch. Expected ₹${Number(transaction.amount)}, received ₹${amount}`,
        },
      });

      sseService.broadcastStatus(orderId, {
        status: 'MANUAL_REVIEW',
        settlementState: 'AMOUNT_MISMATCH',
        message: 'Payment flagged: Amount mismatch. Under review.',
      });

      res.status(400).json({ error: 'Amount mismatch' });
      return;
    }

    // 5. State Machine Mapping
    // Rules:
    // - OBSERVED_SUCCESS: Set status OBSERVED_SUCCESS, settlementState NOT_RECONCILED. Never set RECONCILED.
    // - RECONCILED: Set status RECONCILED, settlementState RECONCILED, paidAt.
    // - MANUAL_REVIEW: Set status MANUAL_REVIEW.
    // - FAILED: Set status FAILED.
    // - EXPIRED: Set status EXPIRED.

    let targetStatus: any = transaction.status;
    let targetSettlement = transaction.settlementState;
    let paidAt: Date | null = transaction.paidAt;

    switch (event) {
      case 'OBSERVED_SUCCESS':
        targetStatus = 'OBSERVED_SUCCESS';
        targetSettlement = 'NOT_RECONCILED';
        break;
      case 'RECONCILED':
        targetStatus = 'RECONCILED';
        targetSettlement = 'RECONCILED';
        paidAt = new Date();
        break;
      case 'MANUAL_REVIEW':
        targetStatus = 'MANUAL_REVIEW';
        break;
      case 'FAILED':
        targetStatus = 'FAILED';
        break;
      case 'EXPIRED':
        targetStatus = 'EXPIRED';
        break;
      case 'SUCCESS':
        // Counter/COD event
        targetStatus = 'RECONCILED';
        targetSettlement = 'COUNTER_SUCCESS';
        paidAt = new Date();
        break;
    }

    // Update Transaction
    const updatedTx = await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: targetStatus,
        settlementState: targetSettlement,
        utr: utr || transaction.utr,
        paidAt,
        gatewayResponse: JSON.stringify(payload),
      },
    });

    // Record Delivery ID for Deduplication
    if (deliveryId) {
      await prisma.webhookDelivery.create({
        data: {
          deliveryId,
          gateway: 'YOUPI_PG_V2',
          event,
          payload: payload as any,
        },
      });
    }

    // Broadcast SSE update to connected guests
    sseService.broadcastStatus(orderId, {
      status: targetStatus,
      settlementState: targetSettlement,
      utr: updatedTx.utr,
      amount: Number(updatedTx.amount),
    });

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Internal webhook processing failure' });
  }
};

/**
 * Owner: Manually reconcile a transaction against the official bank statement
 */
export const reconcileContributionManual = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { invitationId, contributionId } = req.params;

    const parseResult = manualReconciliationSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: parseResult.error.errors[0]?.message || 'Validation failed',
      });
      return;
    }

    const { utr, verificationNotes } = parseResult.data;

    const contribution = await prisma.giftContribution.findUnique({
      where: { id: contributionId },
      include: { paymentTransaction: true },
    });

    if (!contribution || contribution.weddingInvitationId !== invitationId || !contribution.paymentTransaction) {
      res.status(404).json({ success: false, message: 'Contribution transaction not found.' });
      return;
    }

    const updatedTx = await prisma.paymentTransaction.update({
      where: { id: contribution.paymentTransaction.id },
      data: {
        status: 'RECONCILED',
        settlementState: 'RECONCILED',
        utr,
        reconciledAt: new Date(),
        reconciledBy: req.user?.fullName || req.user?.email || 'Owner',
        verificationNotes: verificationNotes || 'Matched manually against official bank statement.',
        paidAt: contribution.paymentTransaction.paidAt || new Date(),
      },
    });

    // Broadcast update to any open SSE connections
    if (updatedTx.orderId) {
      sseService.broadcastStatus(updatedTx.orderId, {
        status: 'RECONCILED',
        settlementState: 'RECONCILED',
        utr,
        amount: Number(updatedTx.amount),
      });
    }

    res.status(200).json({
      success: true,
      message: 'Transaction verified and reconciled with official bank statement.',
      data: { transaction: updatedTx },
    });
  } catch (error) {
    console.error('Manual reconciliation error:', error);
    res.status(500).json({ success: false, message: 'Failed to reconcile transaction.' });
  }
};

/**
 * Owner: Flag a transaction for review or reject a false claim
 */
export const flagContributionReview = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { invitationId, contributionId } = req.params;

    const parseResult = flagReviewSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: parseResult.error.errors[0]?.message || 'Validation failed',
      });
      return;
    }

    const { status, notes } = parseResult.data;

    const contribution = await prisma.giftContribution.findUnique({
      where: { id: contributionId },
      include: { paymentTransaction: true },
    });

    if (!contribution || contribution.weddingInvitationId !== invitationId || !contribution.paymentTransaction) {
      res.status(404).json({ success: false, message: 'Contribution transaction not found.' });
      return;
    }

    const updatedTx = await prisma.paymentTransaction.update({
      where: { id: contribution.paymentTransaction.id },
      data: {
        status: status as any,
        settlementState: status === 'FAILED' ? 'REJECTED' : 'UNDER_REVIEW',
        verificationNotes: notes || `Marked as ${status} by host.`,
      },
    });

    if (updatedTx.orderId) {
      sseService.broadcastStatus(updatedTx.orderId, {
        status,
        settlementState: updatedTx.settlementState,
        amount: Number(updatedTx.amount),
      });
    }

    res.status(200).json({
      success: true,
      message: `Transaction updated to ${status}.`,
      data: { transaction: updatedTx },
    });
  } catch (error) {
    console.error('Flag review error:', error);
    res.status(500).json({ success: false, message: 'Failed to update transaction review status.' });
  }
};

/**
 * Public: Guest submits their 12-digit bank UTR reference after completing the UPI transfer
 * Allows instant attribution while preserving strict reconciliation rules:
 * - Transitions status to OBSERVED_SUCCESS with settlementState: GUEST_SUBMITTED
 * - Never promotes to RECONCILED (host must verify statement)
 * - Broadcasts update to guest SSE stream and host dashboard
 */
export const submitGuestUtr = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { utr } = req.body;

    if (!utr || typeof utr !== 'string' || utr.trim().length < 6) {
      res.status(400).json({
        success: false,
        message: 'Valid bank UTR or UPI transaction reference is required (minimum 6 characters).',
      });
      return;
    }

    const cleanUtr = utr.trim().toUpperCase();

    const contribution = await prisma.giftContribution.findUnique({
      where: { id },
      include: { paymentTransaction: true },
    });

    if (!contribution || !contribution.paymentTransaction) {
      res.status(404).json({ success: false, message: 'Contribution transaction not found.' });
      return;
    }

    const tx = contribution.paymentTransaction;
    const isPending = tx.status === 'PENDING' || tx.status === 'CREATED';

    const updatedTx = await prisma.paymentTransaction.update({
      where: { id: tx.id },
      data: {
        utr: cleanUtr,
        status: isPending ? 'OBSERVED_SUCCESS' : tx.status,
        settlementState: isPending ? 'GUEST_SUBMITTED' : tx.settlementState,
        verificationNotes: `Guest submitted transfer reference: ${cleanUtr}. Awaiting host bank statement reconciliation.`,
      },
    });

    if (tx.orderId) {
      sseService.broadcastStatus(tx.orderId, {
        status: updatedTx.status,
        settlementState: updatedTx.settlementState,
        utr: cleanUtr,
        amount: Number(updatedTx.amount),
        message: 'Payment notification received, checking bank records',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Transaction reference submitted. Host will reconcile against their official bank statement.',
      data: {
        status: updatedTx.status,
        settlementState: updatedTx.settlementState,
        utr: cleanUtr,
      },
    });
  } catch (error) {
    console.error('Submit guest UTR error:', error);
    res.status(500).json({ success: false, message: 'Failed to record transaction reference.' });
  }
};
