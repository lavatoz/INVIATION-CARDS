import crypto from 'crypto';
import { env } from '../config/env';

/**
 * Validates whether a given string is a syntactically valid UPI Virtual Payment Address (VPA).
 * Format: username@bank / username@handle
 */
export function isValidVpa(vpa: string | null | undefined): boolean {
  if (!vpa || typeof vpa !== 'string') return false;
  const clean = vpa.trim().toLowerCase();
  // Valid UPI VPA regex per NPCI: username@bank
  // username: 2-256 chars (alphanumeric, dot, hyphen, underscore)
  // handle: 2-64 chars (alphanumeric, dot, hyphen, underscore)
  return /^[a-z0-9.\-_]{2,256}@[a-z0-9.\-_]{2,64}$/.test(clean);
}

export interface CreateYoupiSessionParams {
  orderId: string;
  amount: number;
  currency?: string;
  guestName: string;
  guestEmail?: string | null;
  guestPhone?: string | null;
  weddingId: string;
  contributionId: string;
  weddingSlug: string;
  upiId: string;
  payeeName?: string;
  isMerchant?: boolean;
}

export interface YoupiSessionResponse {
  paymentId: string;
  orderId: string;
  amount: string;
  amountPaise: number;
  currency: string;
  status: string;
  checkoutUrl: string;
  upiUri: string;
  payeeVpa: string;
  payeeName: string;
  queuePosition: number;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  error?: string;
  payload?: {
    event: 'OBSERVED_SUCCESS' | 'RECONCILED' | 'MANUAL_REVIEW' | 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
    paymentId: string;
    orderId: string;
    amount: string;
    amountPaise?: number;
    currency: string;
    method?: string;
    utr?: string;
    completedAt?: string;
    settlementState?: string;
    metadata?: Record<string, any>;
  };
}

class YoupiService {
  // Enforce repository's strict limit: < 20 transactions per day per receiving account in controlled testing
  private dailyAttempts: Map<string, { count: number; date: string }> = new Map();

  private checkDailyLimit(accountKey: string): boolean {
    const today = new Date().toISOString().slice(0, 10);
    const record = this.dailyAttempts.get(accountKey);

    if (!record || record.date !== today) {
      this.dailyAttempts.set(accountKey, { count: 1, date: today });
      return true;
    }

    if (record.count >= 20) {
      return false;
    }

    record.count++;
    return true;
  }

  public isEnabled(): boolean {
    return Boolean(env.YOUPI_ENABLED && env.YOUPI_ACCOUNT_HOLDER_CONSENT);
  }

  /**
   * Generates authentic, NPCI-compliant UPI payment URIs tested and verified
   * across Google Pay, PhonePe, Paytm, BHIM, Cred, and Amazon Pay.
   *
   * Crucial NPCI Rules for Cross-App Compatibility:
   * 1. `pa` (VPA) MUST retain literal '@' (never URL-encoded as '%40').
   * 2. `pn` (Payee Name) must encode spaces with '%20' (never '+').
   * 3. `am` must be strictly formatted with 2 decimal places (e.g. 500.00).
   * 4. `cu` must be 'INR'.
   * 5. `tn` (Transaction Note) carries the Order ID (max 50 chars, alphanumeric + space).
   * 6. `tr` (Transaction Reference) MUST BE OMITTED for personal P2P VPAs.
   *    Including 'tr' on personal accounts triggers Google Pay and PhonePe error:
   *    "Merchant transaction not allowed on peer account".
   */
  public buildUpiIntentUri(params: {
    upiId: string;
    payeeName: string;
    amount: number;
    orderId: string;
    note?: string;
    isMerchant?: boolean;
    merchantCategoryCode?: string;
  }): string {
    const rawVpa = (params.upiId || '').trim();
    if (!isValidVpa(rawVpa)) {
      throw new Error(`Invalid receiving UPI ID: "${rawVpa}". Must be a valid VPA (e.g. name@bank).`);
    }

    const cleanVpa = rawVpa.toLowerCase();

    // Payee Name: max 99 chars, URL encoded with %20 (NOT +)
    const rawName = (params.payeeName || 'Wedding Gift').trim().substring(0, 99);
    const cleanPn = encodeURIComponent(rawName)
      .replace(/%2B/gi, '%20')
      .replace(/\+/g, '%20');

    // Amount: exactly 2 decimal places
    const cleanAm = Number(params.amount).toFixed(2);
    const cu = 'INR';

    // Transaction note: max 50 chars, alphanumeric, space and hyphens only
    const rawNote = params.note || `Wedding Gift ${params.orderId}`;
    const sanitizedNote = rawNote.replace(/[^a-zA-Z0-9\s-]/g, '').trim().substring(0, 50);
    const cleanTn = encodeURIComponent(sanitizedNote)
      .replace(/%2B/gi, '%20')
      .replace(/\+/g, '%20');

    // Query parameters in canonical order
    const queryParts = [
      `pa=${cleanVpa}`, // Note: Literal @ symbol
      `pn=${cleanPn}`,
      `am=${cleanAm}`,
      `cu=${cu}`,
      `tn=${cleanTn}`,
    ];

    // Only include merchant parameters if explicitly configured as merchant
    if (params.isMerchant) {
      queryParts.push(`tr=${encodeURIComponent(params.orderId)}`);
      if (params.merchantCategoryCode) {
        queryParts.push(`mc=${encodeURIComponent(params.merchantCategoryCode)}`);
      }
    }

    return `upi://pay?${queryParts.join('&')}`;
  }

  /**
   * Creates an official payment session on the YouPI PG V2 instance
   */
  public async createPaymentSession(params: CreateYoupiSessionParams): Promise<YoupiSessionResponse> {
    if (!env.YOUPI_ENABLED) {
      throw new Error('YouPI PG integration is disabled by server configuration.');
    }

    if (!env.YOUPI_ACCOUNT_HOLDER_CONSENT) {
      throw new Error('YouPI PG requires explicit authorization from the receiving bank account holder.');
    }

    const rawVpa = (params.upiId || '').trim();
    if (!isValidVpa(rawVpa)) {
      throw new Error(`Invalid receiving UPI VPA: "${rawVpa}". A valid receiving VPA (e.g. name@bank) is required.`);
    }

    const accountKey = rawVpa;
    if (!this.checkDailyLimit(accountKey)) {
      throw new Error('Experimental safety limit exceeded: YouPI PG allows at most 20 transaction attempts per day in controlled testing mode.');
    }

    const payeeName = (params.payeeName || env.YOUPI_RECEIVING_ACCOUNT_HOLDER || 'Wedding Couple').trim();
    const returnUrl = `${env.CLIENT_URL}/invitation/${params.weddingSlug}?payment=complete&orderId=${params.orderId}`;
    const amountStr = params.amount.toFixed(2);
    const amountPaise = Math.round(params.amount * 100);

    const canonicalUpiUri = this.buildUpiIntentUri({
      upiId: rawVpa,
      payeeName,
      amount: params.amount,
      orderId: params.orderId,
      isMerchant: params.isMerchant,
    });

    const requestBody = {
      orderId: params.orderId,
      amount: amountStr,
      currency: params.currency || 'INR',
      returnUrl,
      customer: {
        name: params.guestName,
        email: params.guestEmail || undefined,
        phoneNumber: params.guestPhone || undefined,
      },
      metadata: {
        weddingId: params.weddingId,
        contributionId: params.contributionId,
        weddingSlug: params.weddingSlug,
        receivingVpa: rawVpa,
        payeeName,
      },
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(`${env.YOUPI_API_URL}/api/v1/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Merchant-Id': env.YOUPI_MERCHANT_ID || '00000000-0000-0000-0000-000000000001',
          'X-Merchant-Key': env.YOUPI_MERCHANT_KEY,
          'Idempotency-Key': `idem_${params.orderId}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        const data = (await response.json()) as any;
        return {
          paymentId: data.paymentId || `youpi_${crypto.randomBytes(8).toString('hex')}`,
          orderId: params.orderId,
          amount: data.amount || amountStr,
          amountPaise: data.amountPaise ? Number(data.amountPaise) : amountPaise,
          currency: data.currency || 'INR',
          status: data.status || 'INITIATED',
          checkoutUrl: data.checkoutUrl || `${env.YOUPI_CHECKOUT_URL}/checkout/${data.paymentId}`,
          upiUri: canonicalUpiUri,
          payeeVpa: rawVpa,
          payeeName,
          queuePosition: data.queuePosition || 0,
        };
      } else {
        const errorText = await response.text();
        console.error(`YouPI PG returned HTTP ${response.status}: ${errorText}`);
        throw new Error(
          `YouPI PG V2 payment gateway is currently unavailable (HTTP ${response.status}). Please try again later or ask the host to switch to Direct UPI Intent QR.`
        );
      }
    } catch (netErr: any) {
      if (netErr?.message?.includes('YouPI PG V2 payment gateway')) {
        throw netErr;
      }
      console.error(`YouPI PG service at ${env.YOUPI_API_URL} is unreachable (${netErr.message}).`);
      throw new Error(
        'YouPI PG V2 payment gateway is currently unreachable. Please try again later or ask the host to switch to Direct UPI Intent QR.'
      );
    }
  }

  /**
   * Verifies an incoming HMAC-SHA256 webhook signature against the raw unparsed request body
   */
  public verifyWebhookSignature(
    rawBody: Buffer | string,
    signatureHeader?: string,
    timestampHeader?: string
  ): WebhookVerificationResult {
    if (!signatureHeader) {
      return { isValid: false, error: 'Missing X-Gateway-Signature header' };
    }

    const secret = env.YOUPI_WEBHOOK_SECRET;
    if (!secret) {
      return { isValid: false, error: 'YOUPI_WEBHOOK_SECRET is not configured on server' };
    }

    // Replay protection: Check timestamp within 5-minute tolerance
    if (timestampHeader) {
      const reqTime = parseInt(timestampHeader, 10);
      const now = Date.now();
      if (!isNaN(reqTime) && Math.abs(now - reqTime) > 5 * 60 * 1000) {
        return { isValid: false, error: 'Webhook timestamp expired (replay protection)' };
      }
    }

    try {
      const cleanSignature = signatureHeader.replace(/^sha256=/, '').trim();
      const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, 'utf8');

      const expectedHmac = crypto
        .createHmac('sha256', secret)
        .update(bodyBuffer)
        .digest('hex');

      const sigBuf = Buffer.from(cleanSignature, 'hex');
      const expectedBuf = Buffer.from(expectedHmac, 'hex');

      if (sigBuf.length !== expectedBuf.length) {
        return { isValid: false, error: 'Signature length mismatch' };
      }

      const isMatch = crypto.timingSafeEqual(sigBuf, expectedBuf);
      if (!isMatch) {
        return { isValid: false, error: 'HMAC signature mismatch' };
      }

      const payload = JSON.parse(bodyBuffer.toString('utf8'));
      return { isValid: true, payload };
    } catch (err: any) {
      return { isValid: false, error: `Verification error: ${err.message}` };
    }
  }

  /**
   * Queries payment status directly from the YouPI PG API
   */
  public async getPaymentStatus(paymentId: string): Promise<any> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${env.YOUPI_API_URL}/api/v1/payments/${encodeURIComponent(paymentId)}`, {
        headers: {
          'X-Merchant-Id': env.YOUPI_MERCHANT_ID || '00000000-0000-0000-0000-000000000001',
          'X-Merchant-Key': env.YOUPI_MERCHANT_KEY,
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }
}

export const youpiService = new YoupiService();
