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
} from '../types';

export const API_BASE = ((import.meta as any).env?.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

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
        ? `Backend API at ${url} returned an HTML error page (HTTP ${response.status} ${response.statusText || 'Error'}). The backend server may be offline or VITE_API_BASE_URL is misconfigured.`
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
};
