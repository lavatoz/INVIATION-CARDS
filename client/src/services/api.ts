import {
  ApiResponse,
  AuthResponse,
  User,
  WeddingInvitation,
  WeddingInvitationSummary,
  CreateInvitationPayload,
  FamilyMember,
  WeddingVenue,
  WeddingEvent,
  CoupleDetails,
  WeddingGuest,
  GuestRsvpRecord,
  RsvpSubmission,
  RsvpResponse,
  AttendanceStats,
  WeddingSponsor,
  GiftSettings,
  GiftTotals,
  GiftContributionRecord,
  InitiateGiftPayload,
  PublicMediaItem,
} from '../types';

/**
 * Resolves the appropriate API base URL.
 * - In production (Render/Vercel): Uses API_BASE_URL or VITE_API_BASE_URL (or /api for same-origin proxy).
 * - In local dev accessed on mobile via LAN IP (e.g. http://192.168.x.x:5173):
 *   If API_BASE_URL was explicitly set with localhost/127.0.0.1, it dynamically substitutes
 *   the current hostname so mobile clients reach the laptop's backend rather than the mobile's localhost.
 * - Ensures any absolute URL ends with /api.
 * - If not provided or is relative (/api), returns /api which leverages Vite's dev proxy.
 */
export const getApiBaseUrl = (): string => {
  const envUrl =
    (import.meta as any).env?.API_BASE_URL ||
    (import.meta as any).env?.VITE_API_BASE_URL;

  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '' && envUrl.trim() !== '/api') {
    let trimmed = envUrl.trim();
    // If accessed from a mobile or external device on LAN (hostname is not localhost/127.0.0.1)
    if (
      typeof window !== 'undefined' &&
      window.location?.hostname &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      if (trimmed.includes('localhost') || trimmed.includes('127.0.0.1')) {
        trimmed = trimmed
          .replace('localhost', window.location.hostname)
          .replace('127.0.0.1', window.location.hostname);
      }
    }
    const clean = trimmed.replace(/\/+$/, '');
    return (clean.startsWith('http://') || clean.startsWith('https://')) && !clean.endsWith('/api')
      ? `${clean}/api`
      : clean;
  }

  return '/api';
};

export const API_BASE = getApiBaseUrl();

/**
 * Resolves a media or logo URL to a fully qualified URL or Data URL.
 * - If already a Data URL (data:image/...) or absolute URL (http://, https://), returns it as-is.
 * - If a relative path (e.g. /api/media/filename.png), prepends the backend origin so requests
 *   are served directly by the backend (Render) rather than hitting Vercel's SPA index.html.
 */
export const resolveMediaUrl = (url: string | null | undefined): string => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Handle relative API paths (e.g. /api/media/... or media/...)
  const apiBase = getApiBaseUrl(); // e.g. "https://invitation-cards.onrender.com/api" or "/api"
  if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
    const backendOrigin = apiBase.replace(/\/api\/?$/, '');
    const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${backendOrigin}${cleanPath}`;
  }

  return trimmed;
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem('wedding_platform_token');
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem('wedding_platform_token', token);
};

export const removeAuthToken = (): void => {
  localStorage.removeItem('wedding_platform_token');
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${endpoint}`;
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (networkError: any) {
    throw new Error(
      `Unable to reach backend API at ${url}. Please verify network connectivity and backend service status.`
    );
  }

  const contentType = response.headers.get('content-type') || '';
  let data: any;

  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = {
        success: false,
        message: `Failed to parse JSON response from ${url} (HTTP ${response.status})`,
      };
    }
  } else {
    // Non-JSON response (e.g. HTML 404/502 from Vercel edge router when backend is offline or unrouted)
    const rawText = await response.text().catch(() => '');
    const isHtml = /<!DOCTYPE html|<html/i.test(rawText);
    data = {
      success: false,
      message: isHtml
        ? `Backend API at ${url} returned an HTML error page (HTTP ${response.status} ${response.statusText || 'Error'}). The backend server may be offline or API_BASE_URL is misconfigured.`
        : `Unexpected response from ${url} (HTTP ${response.status} ${response.statusText || 'Error'}).`,
    };
  }

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
}

export const api = {
  // Health
  checkHealth: () => request<{ status: string; database: { status: string } }>('/health'),

  // Auth
  register: (payload: { email: string; password: string; fullName: string; phoneNumber?: string }) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMe: () => request<{ success: boolean; data: { user: User } }>('/auth/me'),

  logout: () => request<ApiResponse>('/auth/logout', { method: 'POST' }),

  // Public Invitations (No Auth Required)
  getPublicInvitation: (slug: string) =>
    request<{ success: boolean; data: { invitation: import('../types').PublicWeddingInvitation } }>(
      `/public/invitations/${encodeURIComponent(slug)}`
    ),

  // Owner Invitations
  checkSlug: (slug: string, excludeId?: string) =>
    request<{ success: boolean; available: boolean; message: string }>(
      `/owner/check-slug?slug=${encodeURIComponent(slug)}${
        excludeId ? `&excludeId=${encodeURIComponent(excludeId)}` : ''
      }`
    ),

  getOwnerInvitations: () =>
    request<{ success: boolean; data: { invitations: WeddingInvitationSummary[] } }>(
      '/owner/invitations'
    ),

  createInvitation: (payload: CreateInvitationPayload) =>
    request<{ success: boolean; message: string; data: { invitation: WeddingInvitation } }>(
      '/owner/invitations',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  getInvitationById: (id: string) =>
    request<{ success: boolean; data: { invitation: WeddingInvitation } }>(
      `/owner/invitations/${id}`
    ),

  deleteInvitation: (id: string) =>
    request<{ success: boolean; message: string }>(`/owner/invitations/${id}`, {
      method: 'DELETE',
    }),

  // Detailed Section Updates
  updateOverview: (
    id: string,
    payload: {
      titleEn: string;
      titleMl?: string | null;
      slug?: string;
      weddingDate?: string | null;
      descriptionEn?: string | null;
      descriptionMl?: string | null;
      isPublished?: boolean;
      designSettings?: any;
    }
  ) =>
    request<{ success: boolean; message: string; data: { invitation: WeddingInvitation } }>(
      `/owner/invitations/${id}/overview`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    ),

  updateCouple: (id: string, payload: Partial<CoupleDetails>) =>
    request<{ success: boolean; message: string; data: { coupleDetails: CoupleDetails } }>(
      `/owner/invitations/${id}/couple`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    ),

  // Family Members
  addFamilyMember: (id: string, payload: Partial<FamilyMember>) =>
    request<{ success: boolean; message: string; data: { member: FamilyMember } }>(
      `/owner/invitations/${id}/family`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  updateFamilyMember: (id: string, memberId: string, payload: Partial<FamilyMember>) =>
    request<{ success: boolean; message: string; data: { member: FamilyMember } }>(
      `/owner/invitations/${id}/family/${memberId}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    ),

  deleteFamilyMember: (id: string, memberId: string) =>
    request<{ success: boolean; message: string }>(
      `/owner/invitations/${id}/family/${memberId}`,
      {
        method: 'DELETE',
      }
    ),

  // Venues
  addVenue: (id: string, payload: Partial<WeddingVenue>) =>
    request<{ success: boolean; message: string; data: { venue: WeddingVenue } }>(
      `/owner/invitations/${id}/venues`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  updateVenue: (id: string, venueId: string, payload: Partial<WeddingVenue>) =>
    request<{ success: boolean; message: string; data: { venue: WeddingVenue } }>(
      `/owner/invitations/${id}/venues/${venueId}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    ),

  deleteVenue: (id: string, venueId: string) =>
    request<{ success: boolean; message: string }>(
      `/owner/invitations/${id}/venues/${venueId}`,
      {
        method: 'DELETE',
      }
    ),

  // Events
  addEvent: (id: string, payload: any) =>
    request<{ success: boolean; message: string; data: { event: WeddingEvent } }>(
      `/owner/invitations/${id}/events`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  updateEvent: (id: string, eventId: string, payload: any) =>
    request<{ success: boolean; message: string; data: { event: WeddingEvent } }>(
      `/owner/invitations/${id}/events/${eventId}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    ),

  deleteEvent: (id: string, eventId: string) =>
    request<{ success: boolean; message: string }>(
      `/owner/invitations/${id}/events/${eventId}`,
      {
        method: 'DELETE',
      }
    ),

  // --- Phase 4: Guest Management ---

  getGuests: (id: string, params?: { search?: string; side?: string; rsvpStatus?: string }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.side) qs.set('side', params.side);
    if (params?.rsvpStatus) qs.set('rsvpStatus', params.rsvpStatus);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return request<{ success: boolean; data: { guests: WeddingGuest[]; total: number } }>(
      `/owner/invitations/${id}/guests${query}`
    );
  },

  addGuest: (id: string, payload: Partial<WeddingGuest>) =>
    request<{ success: boolean; message: string; data: { guest: WeddingGuest } }>(
      `/owner/invitations/${id}/guests`,
      { method: 'POST', body: JSON.stringify(payload) }
    ),

  updateGuest: (id: string, guestId: string, payload: Partial<WeddingGuest>) =>
    request<{ success: boolean; message: string; data: { guest: WeddingGuest } }>(
      `/owner/invitations/${id}/guests/${guestId}`,
      { method: 'PUT', body: JSON.stringify(payload) }
    ),

  deleteGuest: (id: string, guestId: string) =>
    request<{ success: boolean; message: string }>(
      `/owner/invitations/${id}/guests/${guestId}`,
      { method: 'DELETE' }
    ),

  getRsvps: (id: string) =>
    request<{ success: boolean; data: { rsvps: GuestRsvpRecord[]; total: number } }>(
      `/owner/invitations/${id}/rsvps`
    ),

  updateRsvpByOwner: (id: string, rsvpId: string, payload: Partial<GuestRsvpRecord>) =>
    request<{ success: boolean; message: string; data: { rsvp: GuestRsvpRecord } }>(
      `/owner/invitations/${id}/rsvps/${rsvpId}`,
      { method: 'PUT', body: JSON.stringify(payload) }
    ),

  getAttendanceStats: (id: string) =>
    request<{ success: boolean; data: { stats: AttendanceStats } }>(
      `/owner/invitations/${id}/attendance`
    ),

  exportGuestsCsv: (id: string) => {
    const token = getAuthToken();
    return fetch(`${API_BASE}/owner/invitations/${id}/export-csv`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },

  // --- Public RSVP ---

  submitPublicRsvp: (slug: string, payload: RsvpSubmission) =>
    request<{ success: boolean; message: string; data: RsvpResponse }>(
      `/public/invitations/${encodeURIComponent(slug)}/rsvp`,
      { method: 'POST', body: JSON.stringify(payload) }
    ),

  getRsvpByToken: (token: string) =>
    request<{ success: boolean; data: { rsvp: Partial<RsvpSubmission & { submittedAt: string }> } }>(
      `/public/rsvp/${encodeURIComponent(token)}`
    ),

  updateRsvpByToken: (token: string, payload: RsvpSubmission) =>
    request<{ success: boolean; message: string; data: RsvpResponse }>(
      `/public/rsvp/${encodeURIComponent(token)}`,
      { method: 'PUT', body: JSON.stringify(payload) }
    ),

  // --- Wedding Sponsors Management ---

  getSponsors: (id: string) =>
    request<{ success: boolean; data: { sponsors: WeddingSponsor[]; total: number } }>(
      `/owner/invitations/${id}/sponsors`
    ),

  addSponsor: (id: string, payload: Partial<WeddingSponsor>) =>
    request<{ success: boolean; message: string; data: { sponsor: WeddingSponsor } }>(
      `/owner/invitations/${id}/sponsors`,
      { method: 'POST', body: JSON.stringify(payload) }
    ),

  updateSponsor: (id: string, sponsorId: string, payload: Partial<WeddingSponsor>) =>
    request<{ success: boolean; message: string; data: { sponsor: WeddingSponsor } }>(
      `/owner/invitations/${id}/sponsors/${sponsorId}`,
      { method: 'PUT', body: JSON.stringify(payload) }
    ),

  deleteSponsor: (id: string, sponsorId: string) =>
    request<{ success: boolean; message: string }>(
      `/owner/invitations/${id}/sponsors/${sponsorId}`,
      { method: 'DELETE' }
    ),

  reorderSponsors: (id: string, items: Array<{ id: string; sortOrder: number }>) =>
    request<{ success: boolean; message: string }>(
      `/owner/invitations/${id}/sponsors/reorder`,
      { method: 'POST', body: JSON.stringify({ items }) }
    ),

  uploadSponsorLogo: (id: string, payload: { fileName: string; fileData: string }) =>
    request<{ success: boolean; message: string; data: { fileName: string; url: string } }>(
      `/owner/invitations/${id}/sponsors/upload-logo`,
      { method: 'POST', body: JSON.stringify(payload) }
    ),

  // --- Photo Gallery & Moments Management ---

  getOwnerMedia: (invitationId: string) =>
    request<{ success: boolean; data: { media: PublicMediaItem[]; total: number } }>(
      `/owner/invitations/${invitationId}/media`
    ),

  uploadGalleryPhoto: (
    invitationId: string,
    payload: {
      fileName?: string;
      fileData?: string;
      captionEn?: string;
      captionMl?: string;
      photos?: Array<{ fileName: string; fileData: string; captionEn?: string; captionMl?: string }>;
    }
  ) =>
    request<{
      success: boolean;
      message: string;
      data: { media?: PublicMediaItem; mediaList?: PublicMediaItem[] };
    }>(`/owner/invitations/${invitationId}/media`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  replaceMediaPhoto: (
    invitationId: string,
    mediaId: string,
    payload: { fileName: string; fileData: string; captionEn?: string; captionMl?: string }
  ) =>
    request<{ success: boolean; message: string; data: { media: PublicMediaItem } }>(
      `/owner/invitations/${invitationId}/media/${mediaId}/replace`,
      { method: 'PUT', body: JSON.stringify(payload) }
    ),

  reorderMedia: (invitationId: string, items: Array<{ id: string; sortOrder: number }>) =>
    request<{ success: boolean; message: string }>(
      `/owner/invitations/${invitationId}/media/reorder`,
      { method: 'POST', body: JSON.stringify({ items }) }
    ),

  updateMedia: (
    invitationId: string,
    mediaId: string,
    payload: { captionEn?: string | null; captionMl?: string | null; sortOrder?: number }
  ) =>
    request<{ success: boolean; message: string; data: { media: PublicMediaItem } }>(
      `/owner/invitations/${invitationId}/media/${mediaId}`,
      { method: 'PUT', body: JSON.stringify(payload) }
    ),

  deleteMedia: (invitationId: string, mediaId: string) =>
    request<{ success: boolean; message: string }>(
      `/owner/invitations/${invitationId}/media/${mediaId}`,
      { method: 'DELETE' }
    ),

  // --- Gift Contribution Management ---

  getGiftSettings: (id: string) =>
    request<{ success: boolean; data: { settings: GiftSettings; totals: GiftTotals } }>(
      `/owner/invitations/${id}/gifts/settings`
    ),

  updateGiftSettings: (id: string, payload: Partial<GiftSettings>) =>
    request<{ success: boolean; message: string; data: { settings: GiftSettings } }>(
      `/owner/invitations/${id}/gifts/settings`,
      { method: 'PUT', body: JSON.stringify(payload) }
    ),

  getGiftContributions: (id: string) =>
    request<{ success: boolean; data: { contributions: GiftContributionRecord[]; total: number } }>(
      `/owner/invitations/${id}/gifts/contributions`
    ),

  initiateGiftContribution: (slug: string, payload: InitiateGiftPayload) =>
    request<{
      success: boolean;
      gatewayConfigured: boolean;
      message: string;
      data?: {
        contributionId: string;
        orderId: string;
        transactionReference: string;
        amount: number;
        currency: string;
        status: string;
        checkoutUrl?: string | null;
        upiUri?: string | null;
        payeeVpa?: string | null;
        payeeName?: string | null;
        streamUrl: string;
        statusUrl: string;
      };
    }>(`/public/invitations/${encodeURIComponent(slug)}/gifts/initiate`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getContributionStatus: (contributionId: string) =>
    request<{
      success: boolean;
      data: {
        contributionId: string;
        orderId: string;
        status: string;
        settlementState?: string;
        amount: number;
        currency: string;
        utr?: string;
        paidAt?: string;
        message: string;
      };
    }>(`/public/contributions/${contributionId}/status`),

  reconcileGiftContribution: (
    invitationId: string,
    contributionId: string,
    payload: { utr: string; verificationNotes?: string }
  ) =>
    request<{ success: boolean; message: string; data: { transaction: any } }>(
      `/owner/invitations/${invitationId}/gifts/contributions/${contributionId}/reconcile`,
      { method: 'POST', body: JSON.stringify(payload) }
    ),

  flagContributionReview: (
    invitationId: string,
    contributionId: string,
    payload: { status: 'MANUAL_REVIEW' | 'FAILED'; notes?: string }
  ) =>
    request<{ success: boolean; message: string; data: { transaction: any } }>(
      `/owner/invitations/${invitationId}/gifts/contributions/${contributionId}/flag-review`,
      { method: 'POST', body: JSON.stringify(payload) }
    ),

  submitGuestUtr: (contributionId: string, utr: string) =>
    request<{ success: boolean; message: string; data: { status: string; utr: string } }>(
      `/public/contributions/${contributionId}/submit-utr`,
      { method: 'POST', body: JSON.stringify({ utr }) }
    ),

  // --- Private Guest Registration APIs ---
  registerGuestPublic: (slug: string, payload: {
    fullName: string;
    address?: string | null;
    mobileNumber?: string | null;
    side: 'BRIDE' | 'GROOM';
    note?: string | null;
  }) =>
    request<{ success: boolean; message: string }>(
      `/public/invitations/${encodeURIComponent(slug)}/register-guest`,
      { method: 'POST', body: JSON.stringify(payload) }
    ),

  getGuestRegistrations: (invitationId: string) =>
    request<{
      success: boolean;
      data: {
        summary: {
          total: number;
          brideCount: number;
          groomCount: number;
        };
        registrations: Array<{
          id: string;
          fullName: string;
          address?: string | null;
          mobileNumber?: string | null;
          side: 'BRIDE' | 'GROOM';
          note?: string | null;
          createdAt: string;
        }>;
      };
    }>(`/owner/invitations/${invitationId}/guest-registrations`),

  deleteGuestRegistration: (invitationId: string, registrationId: string) =>
    request<{ success: boolean; message: string }>(
      `/owner/invitations/${invitationId}/guest-registrations/${registrationId}`,
      { method: 'DELETE' }
    ),

  exportGuestRegistrationsCsv: (invitationId: string) => {
    const token = getAuthToken();
    return fetch(`${API_BASE}/owner/invitations/${invitationId}/guest-registrations/export-csv`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
};
