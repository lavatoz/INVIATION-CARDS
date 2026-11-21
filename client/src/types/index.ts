export interface User {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string | null;
  role: 'OWNER' | 'ADMIN';
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data?: {
    user: User;
    token: string;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any;
}

export type FamilySide = 'GROOM' | 'BRIDE' | 'BOTH';

export interface FamilyMember {
  id: string;
  weddingInvitationId: string;
  nameEn: string;
  nameMl?: string | null;
  relationEn: string;
  relationMl?: string | null;
  descriptionEn?: string | null;
  descriptionMl?: string | null;
  side: FamilySide;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface WeddingVenue {
  id: string;
  weddingInvitationId: string;
  nameEn: string;
  nameMl?: string | null;
  addressEn: string;
  addressMl?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;
  landmarkEn?: string | null;
  landmarkMl?: string | null;
  googleMapsUrl?: string | null;
  capacity?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface WeddingEvent {
  id: string;
  weddingInvitationId: string;
  venueId?: string | null;
  venue?: WeddingVenue | null;
  titleEn: string;
  titleMl?: string | null;
  descriptionEn?: string | null;
  descriptionMl?: string | null;
  eventType?: string | null;
  startTime: string;
  endTime?: string | null;
  dressCodeEn?: string | null;
  dressCodeMl?: string | null;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CoupleDetails {
  id: string;
  weddingInvitationId: string;
  partner1NameEn: string;
  partner1NameMl?: string | null;
  partner1Role?: string | null;
  partner1TitleEn?: string | null;
  partner1TitleMl?: string | null;
  partner1BioEn?: string | null;
  partner1BioMl?: string | null;
  partner2NameEn: string;
  partner2NameMl?: string | null;
  partner2Role?: string | null;
  partner2TitleEn?: string | null;
  partner2TitleMl?: string | null;
  partner2BioEn?: string | null;
  partner2BioMl?: string | null;
  storyEn?: string | null;
  storyMl?: string | null;
}

export interface DesignSettings {
  theme?: string;
  coverStyle?: string;
  fontPairing?: string;
  accentColor?: string;
  enableMusic?: boolean;
  musicUrl?: string;
}

export interface WeddingInvitation {
  id: string;
  ownerId: string;
  slug: string;
  titleEn: string;
  titleMl?: string | null;
  descriptionEn?: string | null;
  descriptionMl?: string | null;
  weddingDate?: string | null;
  isPublished: boolean;
  designSettings?: DesignSettings | null;
  createdAt: string;
  updatedAt: string;
  coupleDetails?: CoupleDetails | null;
  familyMembers?: FamilyMember[];
  venues?: WeddingVenue[];
  events?: WeddingEvent[];
  _count?: {
    guests: number;
    rsvps: number;
    events: number;
    venues: number;
    familyMembers: number;
  };
}

export interface WeddingInvitationSummary {
  id: string;
  ownerId: string;
  slug: string;
  titleEn: string;
  titleMl?: string | null;
  descriptionEn?: string | null;
  descriptionMl?: string | null;
  weddingDate?: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  coupleDetails?: {
    partner1NameEn: string;
    partner1NameMl?: string | null;
    partner2NameEn: string;
    partner2NameMl?: string | null;
  } | null;
  _count?: {
    guests: number;
    rsvps: number;
    events: number;
    venues?: number;
    familyMembers?: number;
  };
}

export interface CreateInvitationPayload {
  basic: {
    titleEn: string;
    titleMl?: string | null;
    slug: string;
    weddingDate?: string | null;
    descriptionEn?: string | null;
    descriptionMl?: string | null;
  };
  couple: {
    groomNameEn: string;
    groomNameMl?: string | null;
    groomTitleEn?: string | null;
    groomTitleMl?: string | null;
    groomBioEn?: string | null;
    groomBioMl?: string | null;
    brideNameEn: string;
    brideNameMl?: string | null;
    brideTitleEn?: string | null;
    brideTitleMl?: string | null;
    brideBioEn?: string | null;
    brideBioMl?: string | null;
    storyEn?: string | null;
    storyMl?: string | null;
  };
  familyMembers: Array<{
    nameEn: string;
    nameMl?: string | null;
    relationEn: string;
    relationMl?: string | null;
    descriptionEn?: string | null;
    descriptionMl?: string | null;
    side: FamilySide;
    sortOrder: number;
  }>;
  venues: Array<{
    tempId?: string;
    nameEn: string;
    nameMl?: string | null;
    addressEn: string;
    addressMl?: string | null;
    district?: string | null;
    state?: string | null;
    pincode?: string | null;
    landmarkEn?: string | null;
    landmarkMl?: string | null;
    googleMapsUrl?: string | null;
    capacity?: number | null;
  }>;
  events: Array<{
    titleEn: string;
    titleMl?: string | null;
    eventType?: string | null;
    descriptionEn?: string | null;
    descriptionMl?: string | null;
    startTime: string;
    endTime?: string | null;
    dressCodeEn?: string | null;
    dressCodeMl?: string | null;
    sortOrder: number;
    venueIndex?: number | null;
  }>;
  designSettings?: DesignSettings | null;
}

export interface PublicMediaItem {
  id: string;
  fileName: string;
  url: string;
  captionEn?: string | null;
  captionMl?: string | null;
  mediaType: string;
  sortOrder: number;
}

// --- Phase 4: Guest & RSVP Types ---

export type RSVPStatus = 'ATTENDING' | 'DECLINED' | 'TENTATIVE' | 'PENDING';

export interface WeddingGuest {
  id: string;
  weddingInvitationId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  accessCode?: string | null;
  side?: FamilySide | null;
  guestGroup?: string | null;
  invitedCount: number;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  rsvps?: GuestRsvpSummary[];
}

export interface GuestRsvpSummary {
  id: string;
  status: RSVPStatus;
  attendeeCount: number;
  guestName: string;
  submittedAt: string;
}

export interface GuestRsvpRecord {
  id: string;
  weddingInvitationId: string;
  guestId?: string | null;
  guestName: string;
  guestContact?: string | null;
  phone?: string | null;
  email?: string | null;
  status: RSVPStatus;
  attendeeCount: number;
  accompanyingNames?: string | null;
  dietaryPreferences?: string | null;
  message?: string | null;
  editToken?: string | null;
  submittedAt: string;
  createdAt?: string;
  updatedAt?: string;
  guest?: {
    id: string;
    name: string;
    side?: FamilySide | null;
    guestGroup?: string | null;
  } | null;
}

export interface RsvpSubmission {
  guestName: string;
  phone: string;
  email?: string | null;
  status: 'ATTENDING' | 'DECLINED';
  attendeeCount: number;
  accompanyingNames?: string | null;
  dietaryPreferences?: string | null;
  message?: string | null;
}

export interface RsvpResponse {
  editToken: string;
  status: RSVPStatus;
  attendeeCount: number;
  guestName: string;
  isUpdate?: boolean;
}

export interface FamilySideStats {
  invitedGuests: number;
  invitedPeople: number;
  confirmedRsvps: number;
  confirmedAttendees: number;
}

export interface AttendanceStats {
  totalInvitedGuests: number;
  totalInvitedPeople: number;
  totalRsvps: number;
  confirmed: number;
  totalConfirmedAttendees: number;
  declined: number;
  tentative: number;
  pending: number;
  familyWise: {
    groom: FamilySideStats;
    bride: FamilySideStats;
    unlinked: {
      confirmedRsvps: number;
      confirmedAttendees: number;
    };
  };
}

export interface PublicWeddingInvitation {
  id: string;
  slug: string;
  titleEn: string;
  titleMl?: string | null;
  descriptionEn?: string | null;
  descriptionMl?: string | null;
  weddingDate?: string | null;
  isPublished: boolean;
  designSettings?: DesignSettings | null;
  createdAt: string;
  coupleDetails?: {
    partner1NameEn: string;
    partner1NameMl?: string | null;
    partner1Role?: string | null;
    partner1TitleEn?: string | null;
    partner1TitleMl?: string | null;
    partner1BioEn?: string | null;
    partner1BioMl?: string | null;
    partner1PhotoUrl?: string | null;
    partner2NameEn: string;
    partner2NameMl?: string | null;
    partner2Role?: string | null;
    partner2TitleEn?: string | null;
    partner2TitleMl?: string | null;
    partner2BioEn?: string | null;
    partner2BioMl?: string | null;
    partner2PhotoUrl?: string | null;
    coverPhotoUrl?: string | null;
    storyEn?: string | null;
    storyMl?: string | null;
  } | null;
  familyMembers?: Array<{
    id: string;
    nameEn: string;
    nameMl?: string | null;
    relationEn: string;
    relationMl?: string | null;
    descriptionEn?: string | null;
    descriptionMl?: string | null;
    side: FamilySide;
    sortOrder: number;
  }>;
  venues?: Array<{
    id: string;
    nameEn: string;
    nameMl?: string | null;
    addressEn: string;
    addressMl?: string | null;
    district?: string | null;
    state?: string | null;
    pincode?: string | null;
    landmarkEn?: string | null;
    landmarkMl?: string | null;
    googleMapsUrl?: string | null;
    capacity?: number | null;
  }>;
  events?: Array<{
    id: string;
    titleEn: string;
    titleMl?: string | null;
    eventType?: string | null;
    descriptionEn?: string | null;
    descriptionMl?: string | null;
    startTime: string;
    endTime?: string | null;
    dressCodeEn?: string | null;
    dressCodeMl?: string | null;
    sortOrder: number;
    venue?: {
      id?: string;
      nameEn: string;
      nameMl?: string | null;
      addressEn: string;
      addressMl?: string | null;
      district?: string | null;
      state?: string | null;
      landmarkEn?: string | null;
      landmarkMl?: string | null;
      googleMapsUrl?: string | null;
    } | null;
  }>;
  media?: PublicMediaItem[];
  enableGifts?: boolean;
  giftHeadingEn?: string | null;
  giftHeadingMl?: string | null;
  giftIntroEn?: string | null;
  giftIntroMl?: string | null;
  suggestedGiftAmounts?: number[];
  isPaymentGatewayReady?: boolean;
  sponsors?: PublicSponsorItem[];
}

// --- Wedding Sponsors Types ---

export interface WeddingSponsor {
  id: string;
  weddingInvitationId: string;
  nameEn: string;
  nameMl?: string | null;
  category: string;
  sponsorType?: string | null;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  descriptionEn?: string | null;
  descriptionMl?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  socialLinks?: string | null;
  discountOfferEn?: string | null;
  discountOfferMl?: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PublicSponsorItem {
  id: string;
  nameEn: string;
  nameMl?: string | null;
  category?: string | null;
  sponsorType?: string | null;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  descriptionEn?: string | null;
  descriptionMl?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  socialLinks?: string | null;
  discountOfferEn?: string | null;
  discountOfferMl?: string | null;
  sortOrder: number;
}

// --- Gift Contribution Types ---

export type PaymentLifecycleStatus =
  | 'CREATED'
  | 'PENDING'
  | 'OBSERVED_SUCCESS'
  | 'MANUAL_REVIEW'
  | 'RECONCILED'
  | 'FAILED'
  | 'EXPIRED'
  | 'REFUNDED'
  | 'INITIATED'
  | 'SUCCESS';

export interface GiftSettings {
  enableGifts: boolean;
  giftHeadingEn?: string | null;
  giftHeadingMl?: string | null;
  giftIntroEn?: string | null;
  giftIntroMl?: string | null;
  suggestedGiftAmounts?: string | null;
  suggestedAmounts?: number[];
  isGatewayConfigured?: boolean;
  youpiServerEnabled?: boolean;
  accountHolderAuthorized?: boolean;
  receivingAccountHolder?: string;
  paymentConfig?: {
    isConfigured?: boolean;
    provider?: string;
    keyId?: string;
    upiId?: string;
    merchantId?: string;
    payeeName?: string;
    notes?: string;
  } | null;
}

export interface GiftTotals {
  totalContributions: number;
  verifiedContributions: number;
  verifiedAmount: number;
  reconciledContributions?: number;
  reconciledAmount?: number;
  observedContributions?: number;
  observedAmount?: number;
  pendingContributions?: number;
  pendingAmount: number;
  manualReviewContributions?: number;
  manualReviewAmount?: number;
  failedOrExpiredCount?: number;
}

export interface GiftContributionRecord {
  id: string;
  weddingInvitationId: string;
  contributorName: string;
  contributorEmail?: string | null;
  contributorPhone?: string | null;
  amount: number | string;
  currency: string;
  wishes?: string | null;
  paymentTransactionId?: string | null;
  createdAt: string;
  paymentTransaction?: {
    id: string;
    transactionReference: string;
    orderId?: string | null;
    gateway: string;
    status: PaymentLifecycleStatus;
    settlementState?: string | null;
    amount: number | string;
    currency: string;
    paidAt?: string | null;
    utr?: string | null;
    checkoutUrl?: string | null;
    reconciledAt?: string | null;
    reconciledBy?: string | null;
    verificationNotes?: string | null;
    createdAt?: string;
  } | null;
}

export interface InitiateGiftPayload {
  contributorName: string;
  contributorEmail?: string | null;
  contributorPhone?: string | null;
  amount: number;
  wishes?: string | null;
}

export interface InitiateGiftResponse {
  success: boolean;
  gatewayConfigured: boolean;
  message: string;
  data?: {
    contributionId: string;
    orderId: string;
    transactionReference: string;
    amount: number;
    currency: string;
    status: PaymentLifecycleStatus;
    checkoutUrl?: string | null;
    upiUri?: string | null;
    payeeVpa?: string | null;
    payeeName?: string | null;
    streamUrl: string;
    statusUrl: string;
  };
}
