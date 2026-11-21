# INVIATION-CARDS — Wedding Invitation Platform

A premium digital wedding invitation platform tailored for Indian celebrations and traditional Kerala weddings, designed with a **Swiss Editorial** typographical aesthetic and cultural reverence.

---

## Product Identity & Design System

- **Design Philosophy**: Swiss Editorial — timeless typography, intentional whitespace, structured grid, editorial dividers, and authentic bilingual harmony (Malayalam & English).
- **Color Palette**:
  - Forest Green: `#183D32` (Primary Brand & Accents)
  - Sand Beige: `#E8DDC8` (Borders, Secondary Accents)
  - Warm Ivory: `#F8F5ED` (Canvas & Surfaces)
  - Charcoal: `#292C27` (Typographical Text & Headings)
- **Typography**:
  - English: **Cormorant Garamond** (Headings / Editorial display) & **Lato** (UI & Body copy)
  - Malayalam: **Noto Sans Malayalam** (Bilingual fields & cultural phrasing)

---

## Phase 2 Implemented Features

### 1. Premium Owner Dashboard
- Real-time display of wedding invitations created by the authenticated owner.
- Dynamic draft / published status indicators.
- "Create Invitation" action triggering the multi-step creation wizard.
- Direct entry point to the complete invitation editor.
- Delete draft capability with confirmation modal and cascading deletion.
- **Strictly zero fake wedding cards or fake statistics.**

### 2. Multi-Step Wedding Creation Wizard
- **Step 1: Basic Information**: Wedding title (En & Ml), Bride's name, Groom's name, ceremonial date, and permanent invitation slug with debounced availability check.
- **Step 2: Couple Profiles**: Bride & Groom credentials, bios, and couple introduction / love story in English and Malayalam.
- **Step 3: Family Lineage**: Add and manage family members for both Bride and Groom sides with relationships and optional house/lineage notes.
- **Step 4: Ceremonial Events**: Schedule multiple ceremonies (Muhurtham, Sadhya, Reception, Haldi) with timestamps, descriptions, dress codes, and venue linkages.
- **Step 5: Venues & Locations**: Configure physical venues with addresses, districts, states, PIN codes, landmarks, and Google Maps URLs.
- **Step 6: Review & Final Draft**: Comprehensive summary of all entered information with inline section jump-to-edit and single-transaction save as draft.

### 3. Complete Dedicated Owner Editor
9 dedicated sections with functional edit, add, update, and delete operations:
1. **Wedding Overview**: Title, slug, date, subtitle, and instant draft/publish visibility toggle.
2. **Groom Details**: Credentials, titles, bio, and background.
3. **Bride Details**: Credentials, titles, bio, and background.
4. **Family Details**: Sub-resource CRUD operations for family members across Bride, Groom, or Common sides.
5. **Wedding Events**: Sub-resource CRUD operations for ceremonies with timestamps and venue routing.
6. **Venue and Location**: Sub-resource CRUD operations for halls, convention centres, and map locations.
7. **English Content**: Consolidated English story and narrative editor.
8. **Malayalam Content**: Dedicated Malayalam editor styled with Noto Sans Malayalam.
9. **Invitation Design Settings**: Theme styling, English typography pairing options, and audio preferences.

### 4. Bilingual Editing Architecture
- Separate, independent English and Malayalam inputs side-by-side or stacked with distinct visual badges (`EN` and `മലയാളം`).
- Zero automated translation or field overwriting.

---

## API Endpoints (Phase 2 Additions)

### Slug & Creation
- `GET /api/owner/check-slug?slug=:slug`: Verify slug availability.
- `POST /api/owner/invitations`: Transactionally creates invitation, couple details, venues, events, and family members.
- `GET /api/owner/invitations`: List invitations for authenticated owner.
- `GET /api/owner/invitations/:invitationId`: Full invitation detail with all relations.
- `DELETE /api/owner/invitations/:invitationId`: Permanently deletes invitation draft.

### Dedicated Editor Updates
- `PUT /api/owner/invitations/:invitationId/overview`: Updates basic info, publication status, and design settings.
- `PUT /api/owner/invitations/:invitationId/couple`: Updates partner1, partner2, and story.
- `POST /api/owner/invitations/:invitationId/family`: Add family member.
- `PUT /api/owner/invitations/:invitationId/family/:memberId`: Update family member.
- `DELETE /api/owner/invitations/:invitationId/family/:memberId`: Delete family member.
- `POST /api/owner/invitations/:invitationId/venues`: Add venue.
- `PUT /api/owner/invitations/:invitationId/venues/:venueId`: Update venue.
- `DELETE /api/owner/invitations/:invitationId/venues/:venueId`: Delete venue.
- `POST /api/owner/invitations/:invitationId/events`: Add ceremony event.
- `PUT /api/owner/invitations/:invitationId/events/:eventId`: Update ceremony event.
- `DELETE /api/owner/invitations/:invitationId/events/:eventId`: Delete ceremony event.

---

## Database Changes (Schema Upgrades)

Applied non-destructive, additive modifications to `wedding_invitation` database:
- `WeddingInvitation`: Added `designSettings Json?`.
- `CoupleDetails`: Added `partner1Role String? @default("Groom")` and `partner2Role String? @default("Bride")`.
- `FamilyMember`: Added `descriptionEn String?` and `descriptionMl String?`.
- `WeddingVenue`: Added `district String?`, `state String?`, `pincode String?`.

---

## End-to-End Test Results

1. **Owner Authentication**: Owner registration and login issued secure JWT tokens.
2. **Slug Availability**: Real-time validation confirmed slug availability and rejected duplicates.
3. **Creation Wizard**: Atomic transaction created wedding invitation with 2 couple records, 2 family members, 1 venue, and 2 ceremony events.
4. **Draft Verification**: Verified default `isPublished: false`.
5. **Editor Updates**: Successfully edited overview, updated couple profiles, and added a family member.
6. **Data Persistence**: Verified refreshed fetch matched all updated database records.
7. **Strict Ownership Isolation**: Unauthorized second owner was rejected with `403 Forbidden` on read and update attempts.
8. **Draft Deletion**: Verified owner can delete drafts with cascading cleanup.
