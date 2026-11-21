import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  WeddingInvitation,
  FamilyMember,
  WeddingVenue,
  WeddingEvent,
  FamilySide,
} from '../../types';
import { BilingualInput } from '../BilingualInput';
import { GuestManagement } from '../GuestManagement/GuestManagement';
import { SponsorManagement } from '../SponsorManagement/SponsorManagement';
import { GiftManagement } from '../GiftManagement/GiftManagement';
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  MapPin,
  Palette,
  Heart,
  Globe,
  Languages,
  Users,
  RefreshCw,
  FileText,
  Gift,
  Award,
  Copy,
  Check,
  Share2,
} from 'lucide-react';
import { copyInvitationLink, shareInvitation } from '../../utils/share';

interface WeddingEditorProps {
  invitationId: string;
  onBack: () => void;
  onViewPublic?: (slug: string) => void;
}

type EditorSection =
  | 'overview'
  | 'groom'
  | 'bride'
  | 'family'
  | 'events'
  | 'venues'
  | 'english'
  | 'malayalam'
  | 'design'
  | 'guests'
  | 'gifts'
  | 'sponsors';

export const WeddingEditor: React.FC<WeddingEditorProps> = ({
  invitationId,
  onBack,
  onViewPublic,
}) => {
  const [invitation, setInvitation] = useState<WeddingInvitation | null>(null);
  const [activeSection, setActiveSection] = useState<EditorSection>('overview');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Form states for sections
  // 1. Overview
  const [titleEn, setTitleEn] = useState('');
  const [titleMl, setTitleMl] = useState('');
  const [slug, setSlug] = useState('');
  const [weddingDate, setWeddingDate] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [descriptionMl, setDescriptionMl] = useState('');
  const [isPublished, setIsPublished] = useState(false);

  // 2. Groom Details
  const [groomNameEn, setGroomNameEn] = useState('');
  const [groomNameMl, setGroomNameMl] = useState('');
  const [groomTitleEn, setGroomTitleEn] = useState('');
  const [groomTitleMl, setGroomTitleMl] = useState('');
  const [groomBioEn, setGroomBioEn] = useState('');
  const [groomBioMl, setGroomBioMl] = useState('');

  // 3. Bride Details
  const [brideNameEn, setBrideNameEn] = useState('');
  const [brideNameMl, setBrideNameMl] = useState('');
  const [brideTitleEn, setBrideTitleEn] = useState('');
  const [brideTitleMl, setBrideTitleMl] = useState('');
  const [brideBioEn, setBrideBioEn] = useState('');
  const [brideBioMl, setBrideBioMl] = useState('');

  // Couple Story
  const [storyEn, setStoryEn] = useState('');
  const [storyMl, setStoryMl] = useState('');

  // 4. Family Members
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [editingFamily, setEditingFamily] = useState<Partial<FamilyMember> | null>(null);

  // 5. Venues
  const [venues, setVenues] = useState<WeddingVenue[]>([]);
  const [editingVenue, setEditingVenue] = useState<Partial<WeddingVenue> | null>(null);

  // 6. Events
  const [events, setEvents] = useState<WeddingEvent[]>([]);
  const [editingEvent, setEditingEvent] = useState<Partial<WeddingEvent> | null>(null);

  // 7. Design Settings
  const [theme, setTheme] = useState('forest-editorial');
  const [fontPairing, setFontPairing] = useState('cormorant-lato');
  const [enableMusic, setEnableMusic] = useState(false);

  // Fetch complete invitation data
  const loadInvitation = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await api.getInvitationById(invitationId);
      if (res.success && res.data?.invitation) {
        const inv = res.data.invitation;
        setInvitation(inv);

        // Populate local states
        setTitleEn(inv.titleEn || '');
        setTitleMl(inv.titleMl || '');
        setSlug(inv.slug || '');
        setWeddingDate(
          inv.weddingDate ? new Date(inv.weddingDate).toISOString().split('T')[0] : ''
        );
        setDescriptionEn(inv.descriptionEn || '');
        setDescriptionMl(inv.descriptionMl || '');
        setIsPublished(inv.isPublished || false);

        if (inv.coupleDetails) {
          setGroomNameEn(inv.coupleDetails.partner1NameEn || '');
          setGroomNameMl(inv.coupleDetails.partner1NameMl || '');
          setGroomTitleEn(inv.coupleDetails.partner1TitleEn || '');
          setGroomTitleMl(inv.coupleDetails.partner1TitleMl || '');
          setGroomBioEn(inv.coupleDetails.partner1BioEn || '');
          setGroomBioMl(inv.coupleDetails.partner1BioMl || '');

          setBrideNameEn(inv.coupleDetails.partner2NameEn || '');
          setBrideNameMl(inv.coupleDetails.partner2NameMl || '');
          setBrideTitleEn(inv.coupleDetails.partner2TitleEn || '');
          setBrideTitleMl(inv.coupleDetails.partner2TitleMl || '');
          setBrideBioEn(inv.coupleDetails.partner2BioEn || '');
          setBrideBioMl(inv.coupleDetails.partner2BioMl || '');

          setStoryEn(inv.coupleDetails.storyEn || '');
          setStoryMl(inv.coupleDetails.storyMl || '');
        }

        setFamilyMembers(inv.familyMembers || []);
        setVenues(inv.venues || []);
        setEvents(inv.events || []);

        if (inv.designSettings) {
          const ds = inv.designSettings as any;
          setTheme(ds.theme || 'forest-editorial');
          setFontPairing(ds.fontPairing || 'cormorant-lato');
          setEnableMusic(!!ds.enableMusic);
        }
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to load wedding invitation.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInvitation();
  }, [invitationId]);

  // Flash feedback message
  const triggerSuccess = (message: string) => {
    setFeedback({ type: 'success', message });
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  // Copy Link and Native Share handlers
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const handleCopyLink = async () => {
    if (!isPublished) {
      setFeedback({
        type: 'error',
        message: 'Publish your invitation before sharing it with guests.',
      });
      return;
    }
    const res = await copyInvitationLink(slug);
    if (res.success) {
      setCopiedLink(true);
      triggerSuccess('Invitation link copied successfully!');
      setTimeout(() => setCopiedLink(false), 2500);
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  const handleShare = async () => {
    if (!isPublished) {
      setFeedback({
        type: 'error',
        message: 'Publish your invitation before sharing it with guests.',
      });
      return;
    }
    const res = await shareInvitation(titleEn, slug);
    if (res.message) {
      triggerSuccess(res.message);
    }
  };

  // --- SAVE HANDLERS ---

  // 1. Save Overview
  const handleSaveOverview = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await api.updateOverview(invitationId, {
        titleEn,
        titleMl,
        slug,
        weddingDate: weddingDate ? new Date(weddingDate).toISOString() : null,
        descriptionEn,
        descriptionMl,
        isPublished,
      });

      if (res.success) {
        triggerSuccess('Wedding overview and publication status saved successfully.');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save overview.' });
    } finally {
      setIsSaving(false);
    }
  };

  // 2. Save Groom Details
  const handleSaveGroom = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await api.updateCouple(invitationId, {
        partner1NameEn: groomNameEn,
        partner1NameMl: groomNameMl,
        partner1TitleEn: groomTitleEn,
        partner1TitleMl: groomTitleMl,
        partner1BioEn: groomBioEn,
        partner1BioMl: groomBioMl,
        partner2NameEn: brideNameEn, // maintain existing
        partner2NameMl: brideNameMl,
        storyEn,
        storyMl,
      });

      if (res.success) {
        triggerSuccess('Groom details updated successfully.');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update groom.' });
    } finally {
      setIsSaving(false);
    }
  };

  // 3. Save Bride Details
  const handleSaveBride = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await api.updateCouple(invitationId, {
        partner1NameEn: groomNameEn, // maintain existing
        partner1NameMl: groomNameMl,
        partner2NameEn: brideNameEn,
        partner2NameMl: brideNameMl,
        partner2TitleEn: brideTitleEn,
        partner2TitleMl: brideTitleMl,
        partner2BioEn: brideBioEn,
        partner2BioMl: brideBioMl,
        storyEn,
        storyMl,
      });

      if (res.success) {
        triggerSuccess('Bride details updated successfully.');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update bride.' });
    } finally {
      setIsSaving(false);
    }
  };

  // 4. Save Couple Story (Consolidated content)
  const handleSaveStory = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await api.updateCouple(invitationId, {
        partner1NameEn: groomNameEn,
        partner2NameEn: brideNameEn,
        storyEn,
        storyMl,
      });
      if (res.success) {
        triggerSuccess('Love story & introduction saved successfully.');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save story.' });
    } finally {
      setIsSaving(false);
    }
  };

  // 5. Save Design Settings
  const handleSaveDesign = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await api.updateOverview(invitationId, {
        titleEn,
        designSettings: {
          theme,
          fontPairing,
          enableMusic,
          accentColor: theme === 'midnight-kerala' ? '#292C27' : '#183D32',
        },
      });

      if (res.success) {
        triggerSuccess('Invitation design settings saved successfully.');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save design.' });
    } finally {
      setIsSaving(false);
    }
  };

  // --- SUB-RESOURCE OPERATIONS ---

  // Family Member Operations
  const handleSaveFamilyMember = async (memberData: Partial<FamilyMember>) => {
    setIsSaving(true);
    try {
      if (memberData.id) {
        // Update
        const res = await api.updateFamilyMember(invitationId, memberData.id, memberData);
        if (res.success && res.data?.member) {
          setFamilyMembers((prev) =>
            prev.map((m) => (m.id === memberData.id ? res.data.member : m))
          );
          triggerSuccess('Family member updated.');
          setEditingFamily(null);
        }
      } else {
        // Add
        const res = await api.addFamilyMember(invitationId, memberData);
        if (res.success && res.data?.member) {
          setFamilyMembers((prev) => [...prev, res.data.member]);
          triggerSuccess('Family member added.');
          setEditingFamily(null);
        }
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save family member.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFamilyMember = async (memberId: string) => {
    if (!window.confirm('Are you sure you want to remove this family member?')) return;
    try {
      const res = await api.deleteFamilyMember(invitationId, memberId);
      if (res.success) {
        setFamilyMembers((prev) => prev.filter((m) => m.id !== memberId));
        triggerSuccess('Family member removed.');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete member.' });
    }
  };

  // Venue Operations
  const handleSaveVenue = async (venueData: Partial<WeddingVenue>) => {
    setIsSaving(true);
    try {
      if (venueData.id) {
        const res = await api.updateVenue(invitationId, venueData.id, venueData);
        if (res.success && res.data?.venue) {
          setVenues((prev) => prev.map((v) => (v.id === venueData.id ? res.data.venue : v)));
          triggerSuccess('Venue updated.');
          setEditingVenue(null);
        }
      } else {
        const res = await api.addVenue(invitationId, venueData);
        if (res.success && res.data?.venue) {
          setVenues((prev) => [...prev, res.data.venue]);
          triggerSuccess('Venue added.');
          setEditingVenue(null);
        }
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save venue.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteVenue = async (venueId: string) => {
    if (!window.confirm('Delete this venue? Any linked ceremonies will become unassigned.'))
      return;
    try {
      const res = await api.deleteVenue(invitationId, venueId);
      if (res.success) {
        setVenues((prev) => prev.filter((v) => v.id !== venueId));
        triggerSuccess('Venue deleted.');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete venue.' });
    }
  };

  // Event Operations
  const handleSaveEvent = async (eventData: any) => {
    setIsSaving(true);
    try {
      if (eventData.id) {
        const res = await api.updateEvent(invitationId, eventData.id, eventData);
        if (res.success && res.data?.event) {
          setEvents((prev) => prev.map((e) => (e.id === eventData.id ? res.data.event : e)));
          triggerSuccess('Ceremony event updated.');
          setEditingEvent(null);
        }
      } else {
        const res = await api.addEvent(invitationId, eventData);
        if (res.success && res.data?.event) {
          setEvents((prev) => [...prev, res.data.event]);
          triggerSuccess('Ceremony event added.');
          setEditingEvent(null);
        }
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save event.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      const res = await api.deleteEvent(invitationId, eventId);
      if (res.success) {
        setEvents((prev) => prev.filter((e) => e.id !== eventId));
        triggerSuccess('Ceremony event deleted.');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete event.' });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-24 text-center">
        <RefreshCw className="w-8 h-8 animate-spin text-forest mx-auto mb-4" />
        <p className="font-serif text-lg text-forest">Loading Invitation Editor...</p>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-600 mx-auto" />
        <h2 className="text-2xl font-serif text-forest">Wedding Invitation Not Found</h2>
        <p className="text-xs text-charcoal-muted">
          The requested invitation could not be loaded or you do not have owner permission.
        </p>
        <button
          onClick={onBack}
          className="px-5 py-2.5 bg-forest text-ivory text-xs uppercase tracking-widest font-semibold rounded-sm hover:bg-forest-light"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const sections: { id: EditorSection; label: string; icon: any }[] = [
    { id: 'overview', label: 'Wedding Overview', icon: FileText },
    { id: 'groom', label: 'Groom Details', icon: Heart },
    { id: 'bride', label: 'Bride Details', icon: Heart },
    { id: 'family', label: 'Family Lineage', icon: Users },
    { id: 'events', label: 'Wedding Events', icon: Calendar },
    { id: 'venues', label: 'Venue & Location', icon: MapPin },
    { id: 'english', label: 'English Content', icon: Globe },
    { id: 'malayalam', label: 'Malayalam Content', icon: Languages },
    { id: 'design', label: 'Design Settings', icon: Palette },
    { id: 'guests', label: 'Guest Management', icon: Users },
    { id: 'gifts', label: 'Gift Contributions', icon: Gift },
    { id: 'sponsors', label: 'Wedding Partners', icon: Award },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-sand-border gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 bg-sand/30 hover:bg-sand/60 border border-sand-border text-charcoal rounded-sm transition-colors"
            title="Back to dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span
                className={`text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-sm font-semibold ${
                  isPublished
                    ? 'bg-forest text-ivory'
                    : 'bg-sand text-charcoal'
                }`}
              >
                {isPublished ? 'Published' : 'Draft Mode'}
              </span>
              <span className="text-xs text-charcoal-muted font-mono">
                /{slug}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif text-charcoal mt-1">
              {titleEn}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onViewPublic && slug && (
            <button
              type="button"
              onClick={() => {
                if (!isPublished) {
                  setFeedback({
                    type: 'error',
                    message: 'Publish your invitation before viewing the public page.',
                  });
                  return;
                }
                onViewPublic(slug);
              }}
              disabled={!isPublished}
              className={`px-3.5 py-2 text-xs uppercase tracking-wider font-semibold rounded-sm transition-all flex items-center space-x-1.5 border ${
                isPublished
                  ? 'bg-sand/40 hover:bg-sand border-sand-border text-forest cursor-pointer'
                  : 'bg-sand/10 text-charcoal-muted/40 border-sand-border/30 cursor-not-allowed'
              }`}
              title={
                isPublished
                  ? 'Preview the live public invitation'
                  : 'Publish your invitation before sharing it with guests.'
              }
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">View Public Page</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyLink}
            disabled={!isPublished}
            className={`px-3.5 py-2 text-xs uppercase tracking-wider font-semibold rounded-sm transition-all flex items-center space-x-1.5 border ${
              isPublished
                ? 'bg-sand/40 hover:bg-sand border-sand-border text-forest cursor-pointer'
                : 'bg-sand/10 text-charcoal-muted/40 border-sand-border/30 cursor-not-allowed'
            }`}
            title={
              isPublished
                ? 'Copy public invitation link'
                : 'Publish your invitation before sharing it with guests.'
            }
          >
            {copiedLink ? (
              <Check className="w-3.5 h-3.5 text-emerald-700" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            disabled={!isPublished}
            className={`px-3.5 py-2 text-xs uppercase tracking-wider font-semibold rounded-sm transition-all flex items-center space-x-1.5 border ${
              isPublished
                ? 'bg-sand/40 hover:bg-sand border-sand-border text-forest cursor-pointer'
                : 'bg-sand/10 text-charcoal-muted/40 border-sand-border/30 cursor-not-allowed'
            }`}
            title={
              isPublished
                ? 'Share wedding invitation'
                : 'Publish your invitation before sharing it with guests.'
            }
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>

          <button
            onClick={() => handleSaveOverview()}
            disabled={isSaving}
            className="px-5 py-2 bg-forest text-ivory text-xs uppercase tracking-wider font-semibold rounded-sm hover:bg-forest-light transition-all flex items-center space-x-1.5 border border-forest-dark shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Save Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-sm text-xs flex items-center space-x-2 transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
              : 'bg-red-50 border border-red-300 text-red-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Editor Grid: Sidebar Tabs + Content Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
        <aside className="space-y-1 bg-ivory-surface p-3 rounded-sm border border-sand-border h-fit">
          <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-charcoal-muted border-b border-sand-border/60 mb-2">
            Editor Sections
          </div>
          {sections.map((s) => {
            const Icon = s.icon;
            const isActive = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => {
                  setActiveSection(s.id);
                  setFeedback(null);
                }}
                className={`w-full flex items-center space-x-2.5 px-3.5 py-2.5 rounded-sm text-xs uppercase tracking-wider font-medium transition-all ${
                  isActive
                    ? 'bg-forest text-ivory shadow-sm'
                    : 'text-charcoal hover:bg-sand/40'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-sand' : 'text-forest'}`} />
                <span>{s.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Main Content Workspace */}
        <main className="lg:col-span-3 bg-ivory-surface p-6 sm:p-8 rounded-sm border border-sand-border shadow-sm space-y-6">
          {/* SECTION 1: OVERVIEW */}
          {activeSection === 'overview' && (
            <form onSubmit={handleSaveOverview} className="space-y-6">
              <div className="border-b border-sand-border/70 pb-3 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-serif text-forest">Wedding Overview & Publication</h2>
                  <p className="text-xs text-charcoal-muted mt-0.5">
                    Core identity, ceremonial dates, unique URL slug, and visibility status.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-forest text-ivory text-xs uppercase tracking-widest font-semibold rounded-sm hover:bg-forest-light flex items-center space-x-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>
              </div>

              <BilingualInput
                label="Wedding Title / Headline"
                englishValue={titleEn}
                malayalamValue={titleMl}
                onEnglishChange={setTitleEn}
                onMalayalamChange={setTitleMl}
                required
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1.5">
                    Wedding Date
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-3.5 top-3.5 text-charcoal-muted" />
                    <input
                      type="date"
                      value={weddingDate}
                      onChange={(e) => setWeddingDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-ivory border border-sand-border rounded-sm text-sm text-charcoal focus:outline-none focus:border-forest"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1.5">
                    Public Slug (Unique URL Path)
                  </label>
                  <div className="flex items-center">
                    <span className="px-3 py-2.5 bg-sand/30 border border-r-0 border-sand-border text-xs text-charcoal-muted rounded-l-sm font-mono">
                      /invitation/
                    </span>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) =>
                        setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                      }
                      className="w-full px-3 py-2.5 bg-ivory border border-sand-border rounded-r-sm text-sm font-mono text-charcoal focus:outline-none focus:border-forest"
                    />
                  </div>
                </div>
              </div>

              <BilingualInput
                label="Short Description / Subtitle"
                englishValue={descriptionEn}
                malayalamValue={descriptionMl}
                onEnglishChange={setDescriptionEn}
                onMalayalamChange={setDescriptionMl}
                isTextarea
                rows={2}
              />

              {/* Publication Status Toggle */}
              <div className="p-4 bg-sand/20 border border-sand-border rounded-sm flex items-center justify-between">
                <div>
                  <span className="block text-xs uppercase tracking-wider text-charcoal font-semibold">
                    Publication Status
                  </span>
                  <p className="text-[11px] text-charcoal-muted mt-0.5">
                    {isPublished
                      ? 'Published: Guests can access this invitation via public link.'
                      : 'Draft: Only you (the authenticated owner) can view and edit.'}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-sand-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-ivory after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-ivory after:border-sand after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forest"></div>
                </label>
              </div>
            </form>
          )}

          {/* SECTION 2: GROOM DETAILS */}
          {activeSection === 'groom' && (
            <form onSubmit={handleSaveGroom} className="space-y-6">
              <div className="border-b border-sand-border/70 pb-3 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-serif text-forest">Groom Details</h2>
                  <p className="text-xs text-charcoal-muted mt-0.5">
                    Groom's name, professional credentials, and personal bio in both languages.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-forest text-ivory text-xs uppercase tracking-widest font-semibold rounded-sm hover:bg-forest-light flex items-center space-x-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Groom</span>
                </button>
              </div>

              <BilingualInput
                label="Groom Full Name"
                englishValue={groomNameEn}
                malayalamValue={groomNameMl}
                onEnglishChange={setGroomNameEn}
                onMalayalamChange={setGroomNameMl}
                required
              />

              <BilingualInput
                label="Qualifications & Title"
                englishValue={groomTitleEn}
                malayalamValue={groomTitleMl}
                onEnglishChange={setGroomTitleEn}
                onMalayalamChange={setGroomTitleMl}
                englishPlaceholder="e.g. B.Tech, Senior Enterprise Architect"
                malayalamPlaceholder="ഉദാ: ബി.ടെക്, സോഫ്റ്റ്‌വെയർ എൻജിനീയർ"
              />

              <BilingualInput
                label="Biographical Background"
                englishValue={groomBioEn}
                malayalamValue={groomBioMl}
                onEnglishChange={setGroomBioEn}
                onMalayalamChange={setGroomBioMl}
                englishPlaceholder="Family roots, interests, and aspirations..."
                malayalamPlaceholder="കുടുംബ പശ്ചാത്തലവും താല്പര്യങ്ങളും..."
                isTextarea
                rows={3}
              />
            </form>
          )}

          {/* SECTION 3: BRIDE DETAILS */}
          {activeSection === 'bride' && (
            <form onSubmit={handleSaveBride} className="space-y-6">
              <div className="border-b border-sand-border/70 pb-3 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-serif text-forest">Bride Details</h2>
                  <p className="text-xs text-charcoal-muted mt-0.5">
                    Bride's name, professional credentials, and personal bio in both languages.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-forest text-ivory text-xs uppercase tracking-widest font-semibold rounded-sm hover:bg-forest-light flex items-center space-x-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Bride</span>
                </button>
              </div>

              <BilingualInput
                label="Bride Full Name"
                englishValue={brideNameEn}
                malayalamValue={brideNameMl}
                onEnglishChange={setBrideNameEn}
                onMalayalamChange={setBrideNameMl}
                required
              />

              <BilingualInput
                label="Qualifications & Title"
                englishValue={brideTitleEn}
                malayalamValue={brideTitleMl}
                onEnglishChange={setBrideTitleEn}
                onMalayalamChange={setBrideTitleMl}
                englishPlaceholder="e.g. MBBS, Resident Physician"
                malayalamPlaceholder="ഉദാ: എം.ബി.ബി.എസ്, ഡോക്ടർ"
              />

              <BilingualInput
                label="Biographical Background"
                englishValue={brideBioEn}
                malayalamValue={brideBioMl}
                onEnglishChange={setBrideBioEn}
                onMalayalamChange={setBrideBioMl}
                englishPlaceholder="Family roots, interests, and aspirations..."
                malayalamPlaceholder="കുടുംബ പശ്ചാത്തലവും താല്പര്യങ്ങളും..."
                isTextarea
                rows={3}
              />
            </form>
          )}

          {/* SECTION 4: FAMILY LINEAGE */}
          {activeSection === 'family' && (
            <div className="space-y-6">
              <div className="border-b border-sand-border/70 pb-3 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-serif text-forest">Family Details & Lineage</h2>
                  <p className="text-xs text-charcoal-muted mt-0.5">
                    Family members from both Bride and Groom sides.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setEditingFamily({
                      nameEn: '',
                      nameMl: '',
                      relationEn: '',
                      relationMl: '',
                      descriptionEn: '',
                      descriptionMl: '',
                      side: 'GROOM',
                      sortOrder: familyMembers.length,
                    })
                  }
                  className="px-4 py-2 bg-forest text-ivory text-xs uppercase tracking-widest font-semibold rounded-sm hover:bg-forest-light flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Member</span>
                </button>
              </div>

              {/* Family Editor Modal / Drawer */}
              {editingFamily && (
                <div className="p-5 bg-sand/20 border border-sand-border rounded-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-sand-border/60 pb-2">
                    <span className="font-serif font-bold text-forest text-sm">
                      {editingFamily.id ? 'Edit Family Member' : 'New Family Member'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingFamily(null)}
                      className="text-xs text-charcoal-muted hover:text-charcoal"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <BilingualInput
                      label="Member Name"
                      englishValue={editingFamily.nameEn || ''}
                      malayalamValue={editingFamily.nameMl || ''}
                      onEnglishChange={(v) =>
                        setEditingFamily((prev) => ({ ...prev, nameEn: v }))
                      }
                      onMalayalamChange={(v) =>
                        setEditingFamily((prev) => ({ ...prev, nameMl: v }))
                      }
                      required
                    />
                    <BilingualInput
                      label="Relationship"
                      englishValue={editingFamily.relationEn || ''}
                      malayalamValue={editingFamily.relationMl || ''}
                      onEnglishChange={(v) =>
                        setEditingFamily((prev) => ({ ...prev, relationEn: v }))
                      }
                      onMalayalamChange={(v) =>
                        setEditingFamily((prev) => ({ ...prev, relationMl: v }))
                      }
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1.5">
                        Family Side
                      </label>
                      <select
                        value={editingFamily.side || 'GROOM'}
                        onChange={(e) =>
                          setEditingFamily((prev) => ({
                            ...prev,
                            side: e.target.value as FamilySide,
                          }))
                        }
                        className="w-full px-3 py-2 bg-ivory border border-sand-border rounded-sm text-xs text-charcoal"
                      >
                        <option value="GROOM">Groom's Family (വരന്റെ കുടുംബം)</option>
                        <option value="BRIDE">Bride's Family (വധുവിന്റെ കുടുംബം)</option>
                        <option value="BOTH">Both / Common Elders (പൊതുവായ)</option>
                      </select>
                    </div>

                    <BilingualInput
                      label="Optional House / Lineage Note"
                      englishValue={editingFamily.descriptionEn || ''}
                      malayalamValue={editingFamily.descriptionMl || ''}
                      onEnglishChange={(v) =>
                        setEditingFamily((prev) => ({ ...prev, descriptionEn: v }))
                      }
                      onMalayalamChange={(v) =>
                        setEditingFamily((prev) => ({ ...prev, descriptionMl: v }))
                      }
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingFamily(null)}
                      className="px-4 py-2 border border-sand-border text-xs uppercase tracking-wider rounded-sm text-charcoal-muted"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSaving || !editingFamily.nameEn}
                      onClick={() => handleSaveFamilyMember(editingFamily)}
                      className="px-5 py-2 bg-forest text-ivory text-xs uppercase tracking-widest font-semibold rounded-sm hover:bg-forest-light"
                    >
                      Save Member
                    </button>
                  </div>
                </div>
              )}

              {/* Members List */}
              <div className="space-y-3">
                {familyMembers.length === 0 ? (
                  <p className="text-xs text-charcoal-muted italic py-6 text-center">
                    No family members added yet. Click "+ Add Member" above to list parents and elders.
                  </p>
                ) : (
                  familyMembers.map((m) => (
                    <div
                      key={m.id}
                      className="p-4 bg-ivory border border-sand-border rounded-sm flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-charcoal">{m.nameEn}</span>
                          {m.nameMl && (
                            <span className="text-sm font-malayalam text-forest">
                              ({m.nameMl})
                            </span>
                          )}
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-sand/40 border border-sand-border rounded text-charcoal-muted">
                            {m.side}
                          </span>
                        </div>
                        <p className="text-xs text-charcoal-muted mt-0.5">
                          {m.relationEn}{' '}
                          {m.relationMl && (
                            <span className="font-malayalam">· {m.relationMl}</span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => setEditingFamily(m)}
                          className="p-1.5 text-charcoal-muted hover:text-forest transition-colors"
                          title="Edit member"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteFamilyMember(m.id)}
                          className="p-1.5 text-charcoal-muted hover:text-red-700 transition-colors"
                          title="Delete member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* SECTION 5: WEDDING EVENTS */}
          {activeSection === 'events' && (
            <div className="space-y-6">
              <div className="border-b border-sand-border/70 pb-3 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-serif text-forest">Ceremonial Events & Schedule</h2>
                  <p className="text-xs text-charcoal-muted mt-0.5">
                    Muhurtham, reception, rituals, dress codes, and venue routing.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setEditingEvent({
                      titleEn: '',
                      titleMl: '',
                      eventType: 'Ceremony',
                      startTime: new Date().toISOString(),
                      dressCodeEn: '',
                      dressCodeMl: '',
                    })
                  }
                  className="px-4 py-2 bg-forest text-ivory text-xs uppercase tracking-widest font-semibold rounded-sm hover:bg-forest-light flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Event</span>
                </button>
              </div>

              {/* Event Editor Form */}
              {editingEvent && (
                <div className="p-5 bg-sand/20 border border-sand-border rounded-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-sand-border/60 pb-2">
                    <span className="font-serif font-bold text-forest text-sm">
                      {editingEvent.id ? 'Edit Ceremony Event' : 'New Ceremony Event'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingEvent(null)}
                      className="text-xs text-charcoal-muted hover:text-charcoal"
                    >
                      Cancel
                    </button>
                  </div>

                  <BilingualInput
                    label="Event Title"
                    englishValue={editingEvent.titleEn || ''}
                    malayalamValue={editingEvent.titleMl || ''}
                    onEnglishChange={(v) =>
                      setEditingEvent((prev) => ({ ...prev, titleEn: v }))
                    }
                    onMalayalamChange={(v) =>
                      setEditingEvent((prev) => ({ ...prev, titleMl: v }))
                    }
                    required
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1.5">
                        Start Time
                      </label>
                      <input
                        type="datetime-local"
                        value={
                          editingEvent.startTime
                            ? new Date(editingEvent.startTime).toISOString().slice(0, 16)
                            : ''
                        }
                        onChange={(e) =>
                          setEditingEvent((prev) => ({
                            ...prev,
                            startTime: new Date(e.target.value).toISOString(),
                          }))
                        }
                        className="w-full px-3 py-2 bg-ivory border border-sand-border rounded-sm text-xs text-charcoal"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1.5">
                        End Time (Optional)
                      </label>
                      <input
                        type="datetime-local"
                        value={
                          editingEvent.endTime
                            ? new Date(editingEvent.endTime).toISOString().slice(0, 16)
                            : ''
                        }
                        onChange={(e) =>
                          setEditingEvent((prev) => ({
                            ...prev,
                            endTime: e.target.value
                              ? new Date(e.target.value).toISOString()
                              : null,
                          }))
                        }
                        className="w-full px-3 py-2 bg-ivory border border-sand-border rounded-sm text-xs text-charcoal"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1.5">
                        Assigned Venue
                      </label>
                      <select
                        value={editingEvent.venueId || ''}
                        onChange={(e) =>
                          setEditingEvent((prev) => ({
                            ...prev,
                            venueId: e.target.value || null,
                          }))
                        }
                        className="w-full px-3 py-2 bg-ivory border border-sand-border rounded-sm text-xs text-charcoal"
                      >
                        <option value="">No Venue Assigned</option>
                        {venues.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.nameEn}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <BilingualInput
                    label="Description & Traditions"
                    englishValue={editingEvent.descriptionEn || ''}
                    malayalamValue={editingEvent.descriptionMl || ''}
                    onEnglishChange={(v) =>
                      setEditingEvent((prev) => ({ ...prev, descriptionEn: v }))
                    }
                    onMalayalamChange={(v) =>
                      setEditingEvent((prev) => ({ ...prev, descriptionMl: v }))
                    }
                    isTextarea
                    rows={2}
                  />

                  <BilingualInput
                    label="Dress Code / Attire Note"
                    englishValue={editingEvent.dressCodeEn || ''}
                    malayalamValue={editingEvent.dressCodeMl || ''}
                    onEnglishChange={(v) =>
                      setEditingEvent((prev) => ({ ...prev, dressCodeEn: v }))
                    }
                    onMalayalamChange={(v) =>
                      setEditingEvent((prev) => ({ ...prev, dressCodeMl: v }))
                    }
                  />

                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingEvent(null)}
                      className="px-4 py-2 border border-sand-border text-xs uppercase tracking-wider rounded-sm text-charcoal-muted"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSaving || !editingEvent.titleEn}
                      onClick={() => handleSaveEvent(editingEvent)}
                      className="px-5 py-2 bg-forest text-ivory text-xs uppercase tracking-widest font-semibold rounded-sm hover:bg-forest-light"
                    >
                      Save Ceremony
                    </button>
                  </div>
                </div>
              )}

              {/* Events List */}
              <div className="space-y-3">
                {events.length === 0 ? (
                  <p className="text-xs text-charcoal-muted italic py-6 text-center">
                    No ceremony events added yet. Click "+ Add Event" above to schedule ceremonies.
                  </p>
                ) : (
                  events.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-4 bg-ivory border border-sand-border rounded-sm flex items-start justify-between"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-charcoal">{ev.titleEn}</span>
                          {ev.titleMl && (
                            <span className="text-sm font-malayalam text-forest">
                              ({ev.titleMl})
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-charcoal-muted mt-1 font-mono">
                          {new Date(ev.startTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          {ev.endTime &&
                            ` - ${new Date(ev.endTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}`}
                          {ev.venue && ` · Venue: ${ev.venue.nameEn}`}
                        </p>
                        {ev.dressCodeEn && (
                          <p className="text-[11px] text-charcoal-muted mt-1">
                            Dress Code: {ev.dressCodeEn}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => setEditingEvent(ev)}
                          className="p-1.5 text-charcoal-muted hover:text-forest transition-colors"
                          title="Edit event"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEvent(ev.id)}
                          className="p-1.5 text-charcoal-muted hover:text-red-700 transition-colors"
                          title="Delete event"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* SECTION 6: VENUE & LOCATION */}
          {activeSection === 'venues' && (
            <div className="space-y-6">
              <div className="border-b border-sand-border/70 pb-3 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-serif text-forest">Venues & Geographic Locations</h2>
                  <p className="text-xs text-charcoal-muted mt-0.5">
                    Halls, auditoriums, Google Maps routing, landmarks, and guest capacity.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setEditingVenue({
                      nameEn: '',
                      nameMl: '',
                      addressEn: '',
                      addressMl: '',
                      district: 'Ernakulam',
                      state: 'Kerala',
                      pincode: '',
                      landmarkEn: '',
                      landmarkMl: '',
                      googleMapsUrl: '',
                    })
                  }
                  className="px-4 py-2 bg-forest text-ivory text-xs uppercase tracking-widest font-semibold rounded-sm hover:bg-forest-light flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Venue</span>
                </button>
              </div>

              {/* Venue Editor Form */}
              {editingVenue && (
                <div className="p-5 bg-sand/20 border border-sand-border rounded-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-sand-border/60 pb-2">
                    <span className="font-serif font-bold text-forest text-sm">
                      {editingVenue.id ? 'Edit Venue' : 'New Venue'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingVenue(null)}
                      className="text-xs text-charcoal-muted hover:text-charcoal"
                    >
                      Cancel
                    </button>
                  </div>

                  <BilingualInput
                    label="Venue Name"
                    englishValue={editingVenue.nameEn || ''}
                    malayalamValue={editingVenue.nameMl || ''}
                    onEnglishChange={(v) =>
                      setEditingVenue((prev) => ({ ...prev, nameEn: v }))
                    }
                    onMalayalamChange={(v) =>
                      setEditingVenue((prev) => ({ ...prev, nameMl: v }))
                    }
                    required
                  />

                  <BilingualInput
                    label="Full Address"
                    englishValue={editingVenue.addressEn || ''}
                    malayalamValue={editingVenue.addressMl || ''}
                    onEnglishChange={(v) =>
                      setEditingVenue((prev) => ({ ...prev, addressEn: v }))
                    }
                    onMalayalamChange={(v) =>
                      setEditingVenue((prev) => ({ ...prev, addressMl: v }))
                    }
                    required
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1.5">
                        District
                      </label>
                      <input
                        type="text"
                        value={editingVenue.district || ''}
                        onChange={(e) =>
                          setEditingVenue((prev) => ({ ...prev, district: e.target.value }))
                        }
                        placeholder="Ernakulam"
                        className="w-full px-3 py-2 bg-ivory border border-sand-border rounded-sm text-xs text-charcoal"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1.5">
                        State
                      </label>
                      <input
                        type="text"
                        value={editingVenue.state || ''}
                        onChange={(e) =>
                          setEditingVenue((prev) => ({ ...prev, state: e.target.value }))
                        }
                        placeholder="Kerala"
                        className="w-full px-3 py-2 bg-ivory border border-sand-border rounded-sm text-xs text-charcoal"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1.5">
                        PIN Code
                      </label>
                      <input
                        type="text"
                        value={editingVenue.pincode || ''}
                        onChange={(e) =>
                          setEditingVenue((prev) => ({ ...prev, pincode: e.target.value }))
                        }
                        placeholder="682017"
                        className="w-full px-3 py-2 bg-ivory border border-sand-border rounded-sm text-xs text-charcoal font-mono"
                      />
                    </div>
                  </div>

                  <BilingualInput
                    label="Optional Landmark"
                    englishValue={editingVenue.landmarkEn || ''}
                    malayalamValue={editingVenue.landmarkMl || ''}
                    onEnglishChange={(v) =>
                      setEditingVenue((prev) => ({ ...prev, landmarkEn: v }))
                    }
                    onMalayalamChange={(v) =>
                      setEditingVenue((prev) => ({ ...prev, landmarkMl: v }))
                    }
                  />

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1.5">
                      Google Maps URL
                    </label>
                    <input
                      type="url"
                      value={editingVenue.googleMapsUrl || ''}
                      onChange={(e) =>
                        setEditingVenue((prev) => ({ ...prev, googleMapsUrl: e.target.value }))
                      }
                      placeholder="https://maps.app.goo.gl/..."
                      className="w-full px-3 py-2.5 bg-ivory border border-sand-border rounded-sm text-xs font-mono text-charcoal"
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingVenue(null)}
                      className="px-4 py-2 border border-sand-border text-xs uppercase tracking-wider rounded-sm text-charcoal-muted"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSaving || !editingVenue.nameEn}
                      onClick={() => handleSaveVenue(editingVenue)}
                      className="px-5 py-2 bg-forest text-ivory text-xs uppercase tracking-widest font-semibold rounded-sm hover:bg-forest-light"
                    >
                      Save Venue
                    </button>
                  </div>
                </div>
              )}

              {/* Venues List */}
              <div className="space-y-3">
                {venues.length === 0 ? (
                  <p className="text-xs text-charcoal-muted italic py-6 text-center">
                    No venues added yet. Click "+ Add Venue" above to specify event locations.
                  </p>
                ) : (
                  venues.map((v) => (
                    <div
                      key={v.id}
                      className="p-4 bg-ivory border border-sand-border rounded-sm flex items-start justify-between"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-charcoal">{v.nameEn}</span>
                          {v.nameMl && (
                            <span className="text-sm font-malayalam text-forest">
                              ({v.nameMl})
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-charcoal-muted mt-1">
                          {v.addressEn}
                          {v.district && `, ${v.district}`}
                          {v.pincode && ` - ${v.pincode}`}
                        </p>
                        {v.googleMapsUrl && (
                          <a
                            href={v.googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 text-[11px] text-forest underline mt-1 font-mono"
                          >
                            <MapPin className="w-3 h-3" />
                            <span>View on Google Maps</span>
                          </a>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => setEditingVenue(v)}
                          className="p-1.5 text-charcoal-muted hover:text-forest transition-colors"
                          title="Edit venue"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteVenue(v.id)}
                          className="p-1.5 text-charcoal-muted hover:text-red-700 transition-colors"
                          title="Delete venue"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* SECTION 7: ENGLISH CONTENT */}
          {activeSection === 'english' && (
            <div className="space-y-6">
              <div className="border-b border-sand-border/70 pb-3 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-serif text-forest">English Content Suite</h2>
                  <p className="text-xs text-charcoal-muted mt-0.5">
                    Unified review of all English text, story, invitations, and family announcements.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveStory}
                  className="px-4 py-2 bg-forest text-ivory text-xs uppercase tracking-widest font-semibold rounded-sm hover:bg-forest-light flex items-center space-x-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Story</span>
                </button>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1.5">
                  Couple Story & Introduction (English)
                </label>
                <textarea
                  rows={6}
                  value={storyEn}
                  onChange={(e) => setStoryEn(e.target.value)}
                  placeholder="Tell your story to guests in English..."
                  className="w-full p-4 bg-ivory border border-sand-border rounded-sm text-sm font-sans text-charcoal focus:outline-none focus:border-forest leading-relaxed"
                />
              </div>

              <div className="p-4 bg-ivory border border-sand-border rounded-sm space-y-2">
                <span className="text-xs font-mono font-bold text-forest uppercase tracking-wider">
                  English Preview Snippets
                </span>
                <p className="font-serif text-lg text-charcoal">{titleEn}</p>
                <p className="text-xs text-charcoal-muted">
                  With the blessings of parents and elders, Anand & Divya invite you to share in the joy of their wedding celebration.
                </p>
              </div>
            </div>
          )}

          {/* SECTION 8: MALAYALAM CONTENT */}
          {activeSection === 'malayalam' && (
            <div className="space-y-6">
              <div className="border-b border-sand-border/70 pb-3 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-serif text-forest">Malayalam Content Suite</h2>
                  <p className="text-xs text-charcoal-muted mt-0.5 font-malayalam">
                    പരമ്പരാഗത ശൈലിയിലുള്ള മലയാളം ക്ഷണക്കത്ത് ഉള്ളടക്കം.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveStory}
                  className="px-4 py-2 bg-forest text-ivory text-xs uppercase tracking-widest font-semibold rounded-sm hover:bg-forest-light flex items-center space-x-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>സേവ് ചെയ്യുക</span>
                </button>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1.5 font-malayalam">
                  വിവാഹ സന്ദേശവും വിശേഷങ്ങളും (Malayalam Story & Invitation Text)
                </label>
                <textarea
                  rows={6}
                  value={storyMl}
                  onChange={(e) => setStoryMl(e.target.value)}
                  placeholder="ക്ഷണക്കത്തിലെ മലയാളം സന്ദേശം ഇവിടെ എഴുതുക..."
                  className="w-full p-4 bg-ivory border border-sand-border rounded-sm text-sm font-malayalam text-charcoal focus:outline-none focus:border-forest leading-relaxed"
                />
              </div>

              <div className="p-4 bg-ivory border border-sand-border rounded-sm space-y-2">
                <span className="text-xs font-mono font-bold text-forest uppercase tracking-wider">
                  മലയാളം പ്രിവ്യൂ (Malayalam Typography Preview)
                </span>
                <p className="font-malayalam text-xl text-forest font-semibold">{titleMl || titleEn}</p>
                <p className="text-xs font-malayalam text-charcoal-muted leading-relaxed">
                  ഈശ്വരാനുഗ്രഹത്തോടും മുതിർന്നവരുടെ അനുഗ്രഹാശിസ്സുകളോടും കൂടി നടക്കുന്ന മംഗല്യ വേളയിലേക്ക് താങ്കളെയും കുടുംബത്തെയും സാദരം ക്ഷണിക്കുന്നു.
                </p>
              </div>
            </div>
          )}

          {/* SECTION 9: DESIGN SETTINGS */}
          {activeSection === 'design' && (
            <div className="space-y-6">
              <div className="border-b border-sand-border/70 pb-3 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-serif text-forest">Invitation Design Settings</h2>
                  <p className="text-xs text-charcoal-muted mt-0.5">
                    Typography, color palette accents, and editorial framing.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveDesign}
                  className="px-4 py-2 bg-forest text-ivory text-xs uppercase tracking-widest font-semibold rounded-sm hover:bg-forest-light flex items-center space-x-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Design</span>
                </button>
              </div>

              {/* Theme Palette Selection */}
              <div className="space-y-3">
                <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold">
                  Editorial Theme
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    {
                      id: 'forest-editorial',
                      name: 'Swiss Forest Editorial',
                      desc: 'Deep forest green, warm sand & ivory (Recommended)',
                      colors: ['#183D32', '#E8DDC8', '#F8F5ED'],
                    },
                    {
                      id: 'royal-sand-ivory',
                      name: 'Royal Heritage Sand',
                      desc: 'Subtle kasavu gold, sand beige & charcoal',
                      colors: ['#D5C4A6', '#183D32', '#F8F5ED'],
                    },
                    {
                      id: 'midnight-kerala',
                      name: 'Charcoal Minimalist',
                      desc: 'Editorial charcoal with muted green borders',
                      colors: ['#292C27', '#E8DDC8', '#183D32'],
                    },
                  ].map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`p-4 rounded-sm border cursor-pointer transition-all ${
                        theme === t.id
                          ? 'border-forest bg-sand/30 shadow-sm'
                          : 'border-sand-border bg-ivory hover:border-forest/40'
                      }`}
                    >
                      <div className="flex space-x-2 mb-3">
                        {t.colors.map((c, i) => (
                          <div
                            key={i}
                            className="w-5 h-5 rounded-full border border-sand"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      <h4 className="font-serif font-bold text-sm text-charcoal">{t.name}</h4>
                      <p className="text-[11px] text-charcoal-muted mt-1 leading-normal">
                        {t.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Typography Pairing */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold">
                  English Typography Pairing
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    onClick={() => setFontPairing('cormorant-lato')}
                    className={`p-4 rounded-sm border cursor-pointer ${
                      fontPairing === 'cormorant-lato'
                        ? 'border-forest bg-sand/30'
                        : 'border-sand-border bg-ivory'
                    }`}
                  >
                    <span className="font-serif text-lg block text-forest">
                      Cormorant Garamond & Lato
                    </span>
                    <span className="text-[11px] text-charcoal-muted mt-1 block">
                      Refined Swiss Editorial proportions with classic serif display.
                    </span>
                  </div>

                  <div
                    onClick={() => setFontPairing('playfair-jakarta')}
                    className={`p-4 rounded-sm border cursor-pointer ${
                      fontPairing === 'playfair-jakarta'
                        ? 'border-forest bg-sand/30'
                        : 'border-sand-border bg-ivory'
                    }`}
                  >
                    <span className="font-serif text-lg block text-forest">
                      Playfair Display & Plus Jakarta
                    </span>
                    <span className="text-[11px] text-charcoal-muted mt-1 block">
                      Modern editorial weight with high-contrast serif headlines.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 10: GUEST & RSVP MANAGEMENT */}
          {activeSection === 'guests' && (
            <GuestManagement invitationId={invitationId} />
          )}

          {/* SECTION 11: GIFT SETTINGS & CONTRIBUTIONS */}
          {activeSection === 'gifts' && (
            <GiftManagement invitationId={invitationId} />
          )}

          {/* SECTION 12: WEDDING SPONSORS & PARTNERS */}
          {activeSection === 'sponsors' && (
            <SponsorManagement invitationId={invitationId} />
          )}
        </main>
      </div>
    </div>
  );
};
