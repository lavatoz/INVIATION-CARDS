import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { CreateInvitationPayload, FamilySide } from '../../types';
import { BilingualInput } from '../BilingualInput';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Trash2,
  Calendar,
  MapPin,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

interface WeddingWizardProps {
  onCancel: () => void;
  onSuccess: (invitationId: string) => void;
}

const TOTAL_STEPS = 6;

export const WeddingWizard: React.FC<WeddingWizardProps> = ({ onCancel, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // --- Step 1 State: Basic Wedding Info ---
  const [titleEn, setTitleEn] = useState('');
  const [titleMl, setTitleMl] = useState('');
  const [groomNameEn, setGroomNameEn] = useState('');
  const [groomNameMl, setGroomNameMl] = useState('');
  const [brideNameEn, setBrideNameEn] = useState('');
  const [brideNameMl, setBrideNameMl] = useState('');
  const [weddingDate, setWeddingDate] = useState('');
  const [slug, setSlug] = useState('');
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);

  // Auto-generate suggested slug when names or title change if user hasn't typed custom slug
  const [isSlugUserModified, setIsSlugUserModified] = useState(false);

  useEffect(() => {
    if (!isSlugUserModified && (groomNameEn || brideNameEn || titleEn)) {
      const base =
        groomNameEn && brideNameEn
          ? `${groomNameEn}-and-${brideNameEn}`
          : titleEn || 'wedding';
      const clean = base
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setSlug(clean);
    }
  }, [groomNameEn, brideNameEn, titleEn, isSlugUserModified]);

  // Debounced slug check
  useEffect(() => {
    if (!slug || slug.length < 3) {
      setSlugAvailable(null);
      setSlugError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setSlugChecking(true);
      try {
        const res = await api.checkSlug(slug);
        setSlugAvailable(res.available);
        setSlugError(res.available ? null : res.message || 'Slug already taken');
      } catch (err: any) {
        setSlugAvailable(false);
        setSlugError(err.message || 'Error checking slug');
      } finally {
        setSlugChecking(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [slug]);

  // --- Step 2 State: Couple Details ---
  const [groomTitleEn, setGroomTitleEn] = useState('');
  const [groomTitleMl, setGroomTitleMl] = useState('');
  const [groomBioEn, setGroomBioEn] = useState('');
  const [groomBioMl, setGroomBioMl] = useState('');

  const [brideTitleEn, setBrideTitleEn] = useState('');
  const [brideTitleMl, setBrideTitleMl] = useState('');
  const [brideBioEn, setBrideBioEn] = useState('');
  const [brideBioMl, setBrideBioMl] = useState('');

  const [storyEn, setStoryEn] = useState('');
  const [storyMl, setStoryMl] = useState('');

  // --- Step 3 State: Family Members ---
  interface LocalFamilyMember {
    id: string;
    nameEn: string;
    nameMl: string;
    relationEn: string;
    relationMl: string;
    descriptionEn: string;
    descriptionMl: string;
    side: FamilySide;
  }

  const [familyMembers, setFamilyMembers] = useState<LocalFamilyMember[]>([
    {
      id: 'fam-1',
      nameEn: '',
      nameMl: '',
      relationEn: "Father of the Groom",
      relationMl: 'വരന്റെ പിതാവ്',
      descriptionEn: '',
      descriptionMl: '',
      side: 'GROOM',
    },
    {
      id: 'fam-2',
      nameEn: '',
      nameMl: '',
      relationEn: "Mother of the Bride",
      relationMl: 'വധുവിന്റെ മാതാവ്',
      descriptionEn: '',
      descriptionMl: '',
      side: 'BRIDE',
    },
  ]);

  const addFamilyMember = (side: FamilySide) => {
    setFamilyMembers((prev) => [
      ...prev,
      {
        id: `fam-${Date.now()}`,
        nameEn: '',
        nameMl: '',
        relationEn: side === 'GROOM' ? "Groom's Family" : "Bride's Family",
        relationMl: side === 'GROOM' ? 'വരന്റെ കുടുംബം' : 'വധുവിന്റെ കുടുംബം',
        descriptionEn: '',
        descriptionMl: '',
        side,
      },
    ]);
  };

  const removeFamilyMember = (id: string) => {
    setFamilyMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const updateFamilyMember = (id: string, field: keyof LocalFamilyMember, value: string) => {
    setFamilyMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  // --- Step 4 & 5 State: Venues and Events ---
  interface LocalVenue {
    tempId: string;
    nameEn: string;
    nameMl: string;
    addressEn: string;
    addressMl: string;
    district: string;
    state: string;
    pincode: string;
    landmarkEn: string;
    landmarkMl: string;
    googleMapsUrl: string;
    capacity?: number;
  }

  const [venues, setVenues] = useState<LocalVenue[]>([
    {
      tempId: 'venue-1',
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
    },
  ]);

  const addVenue = () => {
    setVenues((prev) => [
      ...prev,
      {
        tempId: `venue-${Date.now()}`,
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
      },
    ]);
  };

  const removeVenue = (tempId: string) => {
    if (venues.length === 1) return; // Keep at least one
    setVenues((prev) => prev.filter((v) => v.tempId !== tempId));
  };

  const updateVenue = (tempId: string, field: keyof LocalVenue, value: any) => {
    setVenues((prev) =>
      prev.map((v) => (v.tempId === tempId ? { ...v, [field]: value } : v))
    );
  };

  interface LocalEvent {
    id: string;
    titleEn: string;
    titleMl: string;
    eventType: string;
    descriptionEn: string;
    descriptionMl: string;
    date: string;
    startTime: string;
    endTime: string;
    dressCodeEn: string;
    dressCodeMl: string;
    venueIndex: number;
  }

  const [events, setEvents] = useState<LocalEvent[]>([
    {
      id: 'event-1',
      titleEn: 'Muhurtham & Sacred Ceremony',
      titleMl: 'മുഹൂർത്തവും താലികെട്ടും',
      eventType: 'Muhurtham',
      descriptionEn: 'The traditional auspicious ceremony uniting two souls.',
      descriptionMl: 'പാരമ്പര്യ ആചാരങ്ങളോടെ നടക്കുന്ന പവിത്രമായ വിവാഹ മുഹൂർത്തം.',
      date: '',
      startTime: '10:30',
      endTime: '12:00',
      dressCodeEn: 'Traditional Kerala Kasavu / Formal Attire',
      dressCodeMl: 'കേരളീയ പരമ്പരാഗത വേഷം',
      venueIndex: 0,
    },
    {
      id: 'event-2',
      titleEn: 'Sadhya & Reception',
      titleMl: 'സദ്യയും സ്നേഹവിരുന്നും',
      eventType: 'Reception',
      descriptionEn: 'Grand traditional feast served on plantain leaves followed by reception.',
      descriptionMl: 'വിഭവസമൃദ്ധമായ പരമ്പരാഗത കേരള സദ്യയും വിരുന്നും.',
      date: '',
      startTime: '12:30',
      endTime: '15:30',
      dressCodeEn: 'Festive / Traditional',
      dressCodeMl: 'പരമ്പരാഗത വേഷം',
      venueIndex: 0,
    },
  ]);

  const addEvent = () => {
    setEvents((prev) => [
      ...prev,
      {
        id: `ev-${Date.now()}`,
        titleEn: '',
        titleMl: '',
        eventType: 'Ceremony',
        descriptionEn: '',
        descriptionMl: '',
        date: weddingDate || '',
        startTime: '18:00',
        endTime: '21:00',
        dressCodeEn: '',
        dressCodeMl: '',
        venueIndex: 0,
      },
    ]);
  };

  const removeEvent = (id: string) => {
    if (events.length === 1) return;
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const updateEvent = (id: string, field: keyof LocalEvent, value: any) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  // --- Step Validation ---
  const validateCurrentStep = (): boolean => {
    setFormError(null);

    if (currentStep === 1) {
      if (!titleEn.trim()) {
        setFormError('Please enter a wedding title in English.');
        return false;
      }
      if (!groomNameEn.trim()) {
        setFormError("Please enter the groom's name in English.");
        return false;
      }
      if (!brideNameEn.trim()) {
        setFormError("Please enter the bride's name in English.");
        return false;
      }
      if (!slug.trim()) {
        setFormError('Please provide a unique invitation slug.');
        return false;
      }
      if (slugAvailable === false) {
        setFormError('The chosen slug is already taken. Please pick another.');
        return false;
      }
    }

    if (currentStep === 2) {
      // Couple info step
      if (!groomNameEn.trim() || !brideNameEn.trim()) {
        setFormError('Groom and Bride names in English are mandatory.');
        return false;
      }
    }

    if (currentStep === 5) {
      // Venues validation
      for (let i = 0; i < venues.length; i++) {
        if (!venues[i].nameEn.trim() || !venues[i].addressEn.trim()) {
          setFormError(`Venue #${i + 1} requires a venue name and address in English.`);
          return false;
        }
      }
    }

    if (currentStep === 4) {
      // Events validation
      for (let i = 0; i < events.length; i++) {
        if (!events[i].titleEn.trim()) {
          setFormError(`Event #${i + 1} requires an event title in English.`);
          return false;
        }
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setFormError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Final Submission
  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setIsSubmitting(true);
    setFormError(null);

    try {
      // Build ISO timestamps for events
      const formattedEvents = events.map((ev, idx) => {
        const evDate = ev.date || weddingDate || new Date().toISOString().split('T')[0];
        const startIso = new Date(`${evDate}T${ev.startTime || '10:00'}:00`).toISOString();
        const endIso = ev.endTime
          ? new Date(`${evDate}T${ev.endTime}:00`).toISOString()
          : null;

        return {
          titleEn: ev.titleEn.trim(),
          titleMl: ev.titleMl.trim() || null,
          eventType: ev.eventType || null,
          descriptionEn: ev.descriptionEn.trim() || null,
          descriptionMl: ev.descriptionMl.trim() || null,
          startTime: startIso,
          endTime: endIso,
          dressCodeEn: ev.dressCodeEn.trim() || null,
          dressCodeMl: ev.dressCodeMl.trim() || null,
          sortOrder: idx,
          venueIndex: ev.venueIndex,
        };
      });

      // Filter non-empty family members
      const validFamilyMembers = familyMembers
        .filter((m) => m.nameEn.trim())
        .map((m, idx) => ({
          nameEn: m.nameEn.trim(),
          nameMl: m.nameMl.trim() || null,
          relationEn: m.relationEn.trim(),
          relationMl: m.relationMl.trim() || null,
          descriptionEn: m.descriptionEn.trim() || null,
          descriptionMl: m.descriptionMl.trim() || null,
          side: m.side,
          sortOrder: idx,
        }));

      // Format venues
      const formattedVenues = venues.map((v) => ({
        tempId: v.tempId,
        nameEn: v.nameEn.trim(),
        nameMl: v.nameMl.trim() || null,
        addressEn: v.addressEn.trim(),
        addressMl: v.addressMl.trim() || null,
        district: v.district.trim() || null,
        state: v.state.trim() || null,
        pincode: v.pincode.trim() || null,
        landmarkEn: v.landmarkEn.trim() || null,
        landmarkMl: v.landmarkMl.trim() || null,
        googleMapsUrl: v.googleMapsUrl.trim() || null,
        capacity: v.capacity || null,
      }));

      const payload: CreateInvitationPayload = {
        basic: {
          titleEn: titleEn.trim(),
          titleMl: titleMl.trim() || null,
          slug: slug.trim().toLowerCase(),
          weddingDate: weddingDate ? new Date(weddingDate).toISOString() : null,
          descriptionEn: `Wedding of ${groomNameEn} & ${brideNameEn}`,
          descriptionMl: `${groomNameMl || groomNameEn} & ${brideNameMl || brideNameEn} ശുഭവിവാഹം`,
        },
        couple: {
          groomNameEn: groomNameEn.trim(),
          groomNameMl: groomNameMl.trim() || null,
          groomTitleEn: groomTitleEn.trim() || null,
          groomTitleMl: groomTitleMl.trim() || null,
          groomBioEn: groomBioEn.trim() || null,
          groomBioMl: groomBioMl.trim() || null,
          brideNameEn: brideNameEn.trim(),
          brideNameMl: brideNameMl.trim() || null,
          brideTitleEn: brideTitleEn.trim() || null,
          brideTitleMl: brideTitleMl.trim() || null,
          brideBioEn: brideBioEn.trim() || null,
          brideBioMl: brideBioMl.trim() || null,
          storyEn: storyEn.trim() || null,
          storyMl: storyMl.trim() || null,
        },
        familyMembers: validFamilyMembers,
        venues: formattedVenues,
        events: formattedEvents,
        designSettings: {
          theme: 'forest-editorial',
          fontPairing: 'cormorant-lato',
          accentColor: '#183D32',
          enableMusic: false,
        },
      };

      const res = await api.createInvitation(payload);
      if (res.success && res.data?.invitation) {
        onSuccess(res.data.invitation.id);
      } else {
        setFormError(res.message || 'Creation failed');
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit wedding invitation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Wizard Header */}
      <div className="mb-8 border-b border-sand-border pb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-forest font-semibold block mb-1">
              Creation Suite · Multi-Step Wizard
            </span>
            <h1 className="text-3xl font-serif text-charcoal">
              Compose Sacred Invitation
            </h1>
          </div>
          <button
            onClick={onCancel}
            className="text-xs text-charcoal-muted hover:text-forest transition-colors uppercase tracking-wider font-medium"
          >
            Cancel & Return
          </button>
        </div>

        {/* Stepper Progress */}
        <div className="mt-8">
          <div className="flex justify-between items-center text-xs">
            {[
              { num: 1, label: 'Basics' },
              { num: 2, label: 'Couple' },
              { num: 3, label: 'Family' },
              { num: 4, label: 'Events' },
              { num: 5, label: 'Venues' },
              { num: 6, label: 'Review' },
            ].map((s) => (
              <button
                key={s.num}
                type="button"
                onClick={() => {
                  if (s.num < currentStep) setCurrentStep(s.num);
                }}
                className={`flex items-center space-x-1.5 transition-colors ${
                  currentStep === s.num
                    ? 'text-forest font-semibold'
                    : s.num < currentStep
                    ? 'text-charcoal cursor-pointer'
                    : 'text-charcoal-muted/40 cursor-default'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono border ${
                    currentStep === s.num
                      ? 'bg-forest text-ivory border-forest'
                      : s.num < currentStep
                      ? 'bg-sand text-forest border-sand-dark'
                      : 'bg-ivory border-sand-border text-charcoal-muted/50'
                  }`}
                >
                  {s.num < currentStep ? <Check className="w-3 h-3" /> : s.num}
                </span>
                <span className="hidden md:inline uppercase tracking-wider text-[11px]">
                  {s.label}
                </span>
              </button>
            ))}
          </div>

          <div className="w-full bg-sand-light h-1 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-forest h-full transition-all duration-300"
              style={{ width: `${((currentStep - 1) / (TOTAL_STEPS - 1)) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {formError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 text-xs rounded-sm flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Form Container */}
      <div className="bg-ivory-surface p-6 sm:p-10 rounded-sm border border-sand-border shadow-sm space-y-8">
        {/* STEP 1: Basic Wedding Information */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="border-b border-sand-border/70 pb-3">
              <h2 className="text-xl font-serif text-forest">Step 1: Basic Wedding Details</h2>
              <p className="text-xs text-charcoal-muted mt-0.5">
                Title, bride & groom names, ceremonial date, and permanent invitation slug.
              </p>
            </div>

            <BilingualInput
              label="Wedding Title / Headline"
              englishValue={titleEn}
              malayalamValue={titleMl}
              onEnglishChange={setTitleEn}
              onMalayalamChange={setTitleMl}
              englishPlaceholder="e.g. The Wedding of Anand & Divya"
              malayalamPlaceholder="ഉദാ: ആനന്ദ് & ദിവ്യ ശുഭവിവാഹം"
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <BilingualInput
                label="Groom's Full Name"
                englishValue={groomNameEn}
                malayalamValue={groomNameMl}
                onEnglishChange={setGroomNameEn}
                onMalayalamChange={setGroomNameMl}
                englishPlaceholder="Groom's name (e.g. Anand Menon)"
                malayalamPlaceholder="വരന്റെ പേര്"
                required
              />

              <BilingualInput
                label="Bride's Full Name"
                englishValue={brideNameEn}
                malayalamValue={brideNameMl}
                onEnglishChange={setBrideNameEn}
                onMalayalamChange={setBrideNameMl}
                englishPlaceholder="Bride's name (e.g. Divya Nair)"
                malayalamPlaceholder="വധുവിന്റെ പേര്"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div>
                <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1.5">
                  Wedding Date <span className="text-forest">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3.5 top-3.5 text-charcoal-muted" />
                  <input
                    type="date"
                    required
                    value={weddingDate}
                    onChange={(e) => setWeddingDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-ivory border border-sand-border rounded-sm text-sm text-charcoal focus:outline-none focus:border-forest"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-baseline mb-1.5">
                  <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold">
                    Invitation Slug <span className="text-forest">*</span>
                  </label>
                  {slugChecking && (
                    <span className="text-[10px] text-charcoal-muted">checking...</span>
                  )}
                  {!slugChecking && slugAvailable === true && (
                    <span className="text-[10px] text-emerald-700 font-medium">✓ Available</span>
                  )}
                  {!slugChecking && slugAvailable === false && (
                    <span className="text-[10px] text-red-600 font-medium">✗ {slugError}</span>
                  )}
                </div>
                <div className="flex items-center">
                  <span className="px-3 py-2.5 bg-sand/30 border border-r-0 border-sand-border text-xs text-charcoal-muted rounded-l-sm font-mono">
                    /invitation/
                  </span>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => {
                      setIsSlugUserModified(true);
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                    }}
                    placeholder="anand-and-divya"
                    className="w-full px-3 py-2.5 bg-ivory border border-sand-border rounded-r-sm text-sm font-mono text-charcoal focus:outline-none focus:border-forest"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Couple Information */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="border-b border-sand-border/70 pb-3">
              <h2 className="text-xl font-serif text-forest">Step 2: Couple Information</h2>
              <p className="text-xs text-charcoal-muted mt-0.5">
                Bilingual titles, degrees, biographical introductions, and love story.
              </p>
            </div>

            {/* Groom Section */}
            <div className="p-4 bg-ivory/60 border border-sand-border/80 rounded-sm space-y-4">
              <h3 className="text-sm font-serif font-bold text-forest uppercase tracking-wider">
                Groom Profile ({groomNameEn || 'Groom'})
              </h3>
              <BilingualInput
                label="Groom Qualifications / Title"
                englishValue={groomTitleEn}
                malayalamValue={groomTitleMl}
                onEnglishChange={setGroomTitleEn}
                onMalayalamChange={setGroomTitleMl}
                englishPlaceholder="e.g. B.Tech, Senior Architect at Tech Corp"
                malayalamPlaceholder="ഉദാ: ബി.ടെക്, സോഫ്റ്റ്‌വെയർ എൻജിനീയർ"
              />
              <BilingualInput
                label="Groom Bio & Background"
                englishValue={groomBioEn}
                malayalamValue={groomBioMl}
                onEnglishChange={setGroomBioEn}
                onMalayalamChange={setGroomBioMl}
                englishPlaceholder="Brief description of groom's roots and family background..."
                malayalamPlaceholder="വരന്റെ കുടുംബത്തെയും നാടിനെയും കുറിച്ചുള്ള വിവരണം..."
                isTextarea
                rows={2}
              />
            </div>

            {/* Bride Section */}
            <div className="p-4 bg-ivory/60 border border-sand-border/80 rounded-sm space-y-4">
              <h3 className="text-sm font-serif font-bold text-forest uppercase tracking-wider">
                Bride Profile ({brideNameEn || 'Bride'})
              </h3>
              <BilingualInput
                label="Bride Qualifications / Title"
                englishValue={brideTitleEn}
                malayalamValue={brideTitleMl}
                onEnglishChange={setBrideTitleEn}
                onMalayalamChange={setBrideTitleMl}
                englishPlaceholder="e.g. MBBS, Resident Physician"
                malayalamPlaceholder="ഉദാ: എം.ബി.ബി.എസ്, ഡോക്ടർ"
              />
              <BilingualInput
                label="Bride Bio & Background"
                englishValue={brideBioEn}
                malayalamValue={brideBioMl}
                onEnglishChange={setBrideBioEn}
                onMalayalamChange={setBrideBioMl}
                englishPlaceholder="Brief description of bride's roots and family background..."
                malayalamPlaceholder="വധുവിന്റെ കുടുംബത്തെയും നാടിനെയും കുറിച്ചുള്ള വിവരണം..."
                isTextarea
                rows={2}
              />
            </div>

            {/* Couple Story */}
            <div className="pt-2">
              <BilingualInput
                label="Couple Introduction & Story"
                englishValue={storyEn}
                malayalamValue={storyMl}
                onEnglishChange={setStoryEn}
                onMalayalamChange={setStoryMl}
                englishPlaceholder="How they met, family blessings, and their journey together..."
                malayalamPlaceholder="ഇരുവരുടെയും പരിചയവും കുടുംബങ്ങളുടെ അനുഗ്രഹവും..."
                isTextarea
                rows={3}
              />
            </div>
          </div>
        )}

        {/* STEP 3: Family Information */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="border-b border-sand-border/70 pb-3 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-serif text-forest">Step 3: Family Lineage & Members</h2>
                <p className="text-xs text-charcoal-muted mt-0.5">
                  Honor parents, grandparents, and key family members from both sides.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {familyMembers.map((fam, index) => (
                <div
                  key={fam.id}
                  className="p-4 bg-ivory border border-sand-border rounded-sm space-y-3 relative group"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-mono font-bold text-forest uppercase tracking-wider">
                      #{index + 1} · {fam.side} Family Member
                    </span>
                    <div className="flex items-center space-x-3">
                      <select
                        value={fam.side}
                        onChange={(e) =>
                          updateFamilyMember(fam.id, 'side', e.target.value as FamilySide)
                        }
                        className="text-xs bg-sand/30 border border-sand-border rounded px-2 py-1 text-charcoal"
                      >
                        <option value="GROOM">Groom's Side (വരന്റെ കുടുംബം)</option>
                        <option value="BRIDE">Bride's Side (വധുവിന്റെ കുടുംബം)</option>
                        <option value="BOTH">Both / Elders (പൊതുവായ)</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeFamilyMember(fam.id)}
                        className="text-charcoal-muted hover:text-red-700 transition-colors p-1"
                        title="Remove member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <BilingualInput
                      label="Member Full Name"
                      englishValue={fam.nameEn}
                      malayalamValue={fam.nameMl}
                      onEnglishChange={(v) => updateFamilyMember(fam.id, 'nameEn', v)}
                      onMalayalamChange={(v) => updateFamilyMember(fam.id, 'nameMl', v)}
                      englishPlaceholder="e.g. K. Raghavan Nair"
                      malayalamPlaceholder="പേര്"
                      required
                    />
                    <BilingualInput
                      label="Relationship"
                      englishValue={fam.relationEn}
                      malayalamValue={fam.relationMl}
                      onEnglishChange={(v) => updateFamilyMember(fam.id, 'relationEn', v)}
                      onMalayalamChange={(v) => updateFamilyMember(fam.id, 'relationMl', v)}
                      englishPlaceholder="e.g. Father of the Groom"
                      malayalamPlaceholder="ബന്ധം (ഉദാ: വരന്റെ പിതാവ്)"
                      required
                    />
                  </div>

                  <BilingualInput
                    label="Optional Lineage / House Name Note"
                    englishValue={fam.descriptionEn}
                    malayalamValue={fam.descriptionMl}
                    onEnglishChange={(v) => updateFamilyMember(fam.id, 'descriptionEn', v)}
                    onMalayalamChange={(v) => updateFamilyMember(fam.id, 'descriptionMl', v)}
                    englishPlaceholder="e.g. Kizhakkeveettil, Retired Professor"
                    malayalamPlaceholder="ഉദാ: കിഴക്കേവീട്ടിൽ, റിട്ട. പ്രൊഫസർ"
                  />
                </div>
              ))}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => addFamilyMember('GROOM')}
                  className="px-4 py-2 bg-sand/40 hover:bg-sand border border-sand-border text-xs uppercase tracking-wider text-forest font-semibold rounded-sm transition-colors flex items-center space-x-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Groom's Family Member</span>
                </button>
                <button
                  type="button"
                  onClick={() => addFamilyMember('BRIDE')}
                  className="px-4 py-2 bg-sand/40 hover:bg-sand border border-sand-border text-xs uppercase tracking-wider text-forest font-semibold rounded-sm transition-colors flex items-center space-x-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Bride's Family Member</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Wedding Events */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="border-b border-sand-border/70 pb-3 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-serif text-forest">Step 4: Ceremonial Events</h2>
                <p className="text-xs text-charcoal-muted mt-0.5">
                  Muhurtham, Madhuramveppu, Haldi, Reception, or other rituals with timestamps.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {events.map((ev, index) => (
                <div
                  key={ev.id}
                  className="p-5 bg-ivory border border-sand-border rounded-sm space-y-4 relative"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-mono font-bold text-forest uppercase tracking-wider flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Ceremony #{index + 1}</span>
                    </span>
                    {events.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEvent(ev.id)}
                        className="text-charcoal-muted hover:text-red-700 transition-colors p-1"
                        title="Remove event"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <BilingualInput
                    label="Event Title"
                    englishValue={ev.titleEn}
                    malayalamValue={ev.titleMl}
                    onEnglishChange={(v) => updateEvent(ev.id, 'titleEn', v)}
                    onMalayalamChange={(v) => updateEvent(ev.id, 'titleMl', v)}
                    englishPlaceholder="e.g. Muhurtham & Tali Kettu"
                    malayalamPlaceholder="ഉദാ: മുഹൂർത്തവും താലികെട്ടും"
                    required
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1.5">
                        Date
                      </label>
                      <input
                        type="date"
                        value={ev.date || weddingDate}
                        onChange={(e) => updateEvent(ev.id, 'date', e.target.value)}
                        className="w-full px-3 py-2 bg-ivory border border-sand-border rounded-sm text-xs text-charcoal"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1.5">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={ev.startTime}
                        onChange={(e) => updateEvent(ev.id, 'startTime', e.target.value)}
                        className="w-full px-3 py-2 bg-ivory border border-sand-border rounded-sm text-xs text-charcoal"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1.5">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={ev.endTime}
                        onChange={(e) => updateEvent(ev.id, 'endTime', e.target.value)}
                        className="w-full px-3 py-2 bg-ivory border border-sand-border rounded-sm text-xs text-charcoal"
                      />
                    </div>
                  </div>

                  <BilingualInput
                    label="Ceremonial Description / Ritual Notes"
                    englishValue={ev.descriptionEn}
                    malayalamValue={ev.descriptionMl}
                    onEnglishChange={(v) => updateEvent(ev.id, 'descriptionEn', v)}
                    onMalayalamChange={(v) => updateEvent(ev.id, 'descriptionMl', v)}
                    englishPlaceholder="Brief details about traditions and timings..."
                    malayalamPlaceholder="ചടങ്ങിനെക്കുറിച്ചുള്ള വിവരണം..."
                  />

                  <BilingualInput
                    label="Dress Code / Attire Recommendation"
                    englishValue={ev.dressCodeEn}
                    malayalamValue={ev.dressCodeMl}
                    onEnglishChange={(v) => updateEvent(ev.id, 'dressCodeEn', v)}
                    onMalayalamChange={(v) => updateEvent(ev.id, 'dressCodeMl', v)}
                    englishPlaceholder="e.g. Kerala Kasavu / Traditional Attire"
                    malayalamPlaceholder="ഉദാ: കേരളീയ പരമ്പരാഗത വേഷം"
                  />
                </div>
              ))}

              <button
                type="button"
                onClick={addEvent}
                className="px-4 py-2 bg-sand/40 hover:bg-sand border border-sand-border text-xs uppercase tracking-wider text-forest font-semibold rounded-sm transition-colors flex items-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Event / Ritual</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Wedding Venue & Location */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="border-b border-sand-border/70 pb-3 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-serif text-forest">Step 5: Venues & Locations</h2>
                <p className="text-xs text-charcoal-muted mt-0.5">
                  Auditorium, temple, hall addresses, districts, PIN, and Google Maps location.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {venues.map((venue, index) => (
                <div
                  key={venue.tempId}
                  className="p-5 bg-ivory border border-sand-border rounded-sm space-y-4 relative"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-mono font-bold text-forest uppercase tracking-wider flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Venue #{index + 1}</span>
                    </span>
                    {venues.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeVenue(venue.tempId)}
                        className="text-charcoal-muted hover:text-red-700 transition-colors p-1"
                        title="Remove venue"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <BilingualInput
                    label="Venue Name"
                    englishValue={venue.nameEn}
                    malayalamValue={venue.nameMl}
                    onEnglishChange={(v) => updateVenue(venue.tempId, 'nameEn', v)}
                    onMalayalamChange={(v) => updateVenue(venue.tempId, 'nameMl', v)}
                    englishPlaceholder="e.g. Gokulam Convention Centre"
                    malayalamPlaceholder="ഉദാ: ഗോകുലം കൺവെൻഷൻ സെന്റർ"
                    required
                  />

                  <BilingualInput
                    label="Full Address"
                    englishValue={venue.addressEn}
                    malayalamValue={venue.addressMl}
                    onEnglishChange={(v) => updateVenue(venue.tempId, 'addressEn', v)}
                    onMalayalamChange={(v) => updateVenue(venue.tempId, 'addressMl', v)}
                    englishPlaceholder="e.g. Kaloor, Kochi"
                    malayalamPlaceholder="വിലാസം"
                    required
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1.5">
                        District
                      </label>
                      <input
                        type="text"
                        value={venue.district}
                        onChange={(e) => updateVenue(venue.tempId, 'district', e.target.value)}
                        placeholder="e.g. Ernakulam / Thrissur"
                        className="w-full px-3 py-2 bg-ivory border border-sand-border rounded-sm text-xs text-charcoal"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1.5">
                        State
                      </label>
                      <input
                        type="text"
                        value={venue.state}
                        onChange={(e) => updateVenue(venue.tempId, 'state', e.target.value)}
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
                        value={venue.pincode}
                        onChange={(e) => updateVenue(venue.tempId, 'pincode', e.target.value)}
                        placeholder="682017"
                        className="w-full px-3 py-2 bg-ivory border border-sand-border rounded-sm text-xs text-charcoal font-mono"
                      />
                    </div>
                  </div>

                  <BilingualInput
                    label="Optional Landmark"
                    englishValue={venue.landmarkEn}
                    malayalamValue={venue.landmarkMl}
                    onEnglishChange={(v) => updateVenue(venue.tempId, 'landmarkEn', v)}
                    onMalayalamChange={(v) => updateVenue(venue.tempId, 'landmarkMl', v)}
                    englishPlaceholder="Near Kaloor Metro Station"
                    malayalamPlaceholder="മെട്രോ സ്റ്റേഷന് സമീപം"
                  />

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1.5">
                      Google Maps URL
                    </label>
                    <input
                      type="url"
                      value={venue.googleMapsUrl}
                      onChange={(e) =>
                        updateVenue(venue.tempId, 'googleMapsUrl', e.target.value)
                      }
                      placeholder="https://maps.app.goo.gl/..."
                      className="w-full px-3 py-2.5 bg-ivory border border-sand-border rounded-sm text-xs font-mono text-charcoal"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addVenue}
                className="px-4 py-2 bg-sand/40 hover:bg-sand border border-sand-border text-xs uppercase tracking-wider text-forest font-semibold rounded-sm transition-colors flex items-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Additional Venue</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: Review & Final Draft Confirmation */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div className="border-b border-sand-border/70 pb-3">
              <h2 className="text-xl font-serif text-forest">Step 6: Review & Save as Draft</h2>
              <p className="text-xs text-charcoal-muted mt-0.5">
                Review all entered wedding details before saving to your owner suite.
              </p>
            </div>

            <div className="space-y-6 text-sm">
              {/* Section 1 summary */}
              <div className="p-4 bg-ivory border border-sand-border rounded-sm space-y-2">
                <div className="flex justify-between items-center border-b border-sand-border/60 pb-2">
                  <span className="font-serif font-bold text-forest">Basic Overview</span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="text-xs text-forest underline uppercase tracking-wider"
                  >
                    Edit
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-charcoal-muted block">Title (EN):</span>
                    <span className="font-medium">{titleEn}</span>
                  </div>
                  <div>
                    <span className="text-charcoal-muted block">Title (ML):</span>
                    <span className="font-malayalam font-medium">{titleMl || '—'}</span>
                  </div>
                  <div>
                    <span className="text-charcoal-muted block">Groom:</span>
                    <span className="font-medium">{groomNameEn}</span>
                  </div>
                  <div>
                    <span className="text-charcoal-muted block">Bride:</span>
                    <span className="font-medium">{brideNameEn}</span>
                  </div>
                  <div>
                    <span className="text-charcoal-muted block">Wedding Date:</span>
                    <span className="font-mono">{weddingDate || 'TBD'}</span>
                  </div>
                  <div>
                    <span className="text-charcoal-muted block">Public Slug:</span>
                    <span className="font-mono text-forest">/{slug}</span>
                  </div>
                </div>
              </div>

              {/* Section 2 summary */}
              <div className="p-4 bg-ivory border border-sand-border rounded-sm space-y-2">
                <div className="flex justify-between items-center border-b border-sand-border/60 pb-2">
                  <span className="font-serif font-bold text-forest">Couple Profiles</span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="text-xs text-forest underline uppercase tracking-wider"
                  >
                    Edit
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-charcoal-muted block font-semibold">Groom Details:</span>
                    <p>{groomTitleEn || 'No title set'}</p>
                    <p className="text-charcoal-muted mt-1">{groomBioEn || 'No bio entered'}</p>
                  </div>
                  <div>
                    <span className="text-charcoal-muted block font-semibold">Bride Details:</span>
                    <p>{brideTitleEn || 'No title set'}</p>
                    <p className="text-charcoal-muted mt-1">{brideBioEn || 'No bio entered'}</p>
                  </div>
                </div>
              </div>

              {/* Section 3 summary */}
              <div className="p-4 bg-ivory border border-sand-border rounded-sm space-y-2">
                <div className="flex justify-between items-center border-b border-sand-border/60 pb-2">
                  <span className="font-serif font-bold text-forest">
                    Family Members ({familyMembers.filter((m) => m.nameEn).length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="text-xs text-forest underline uppercase tracking-wider"
                  >
                    Edit
                  </button>
                </div>
                <div className="space-y-1 text-xs">
                  {familyMembers
                    .filter((m) => m.nameEn)
                    .map((m, i) => (
                      <div key={i} className="flex justify-between py-1 border-b border-sand/40">
                        <span>
                          <strong>{m.nameEn}</strong>{' '}
                          {m.nameMl && <span className="font-malayalam">({m.nameMl})</span>} -{' '}
                          {m.relationEn}
                        </span>
                        <span className="text-charcoal-muted uppercase text-[10px]">
                          {m.side}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Section 4 & 5 summary */}
              <div className="p-4 bg-ivory border border-sand-border rounded-sm space-y-2">
                <div className="flex justify-between items-center border-b border-sand-border/60 pb-2">
                  <span className="font-serif font-bold text-forest">
                    Events ({events.length}) & Venues ({venues.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    className="text-xs text-forest underline uppercase tracking-wider"
                  >
                    Edit
                  </button>
                </div>
                <div className="space-y-2 text-xs">
                  {events.map((ev, i) => (
                    <div key={i} className="py-1">
                      <span className="font-bold">{ev.titleEn}</span>{' '}
                      <span className="text-charcoal-muted">
                        ({ev.startTime} - {ev.endTime || 'end'})
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-sand/40 text-charcoal-muted">
                    Venue: {venues[0]?.nameEn || '—'} ({venues[0]?.district || 'Kerala'})
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div className="flex justify-between items-center pt-6 border-t border-sand-border">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-ivory border border-sand-border text-xs uppercase tracking-wider font-semibold text-charcoal rounded-sm hover:bg-sand/30 transition-colors flex items-center space-x-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 bg-ivory border border-sand-border text-xs uppercase tracking-wider font-semibold text-charcoal-muted hover:text-charcoal rounded-sm transition-colors"
            >
              Cancel
            </button>
          )}

          {currentStep < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 bg-forest text-ivory text-xs uppercase tracking-widest font-semibold rounded-sm hover:bg-forest-light transition-all flex items-center space-x-1.5 border border-forest-dark shadow-sm"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-7 py-3 bg-forest text-ivory text-xs uppercase tracking-widest font-semibold rounded-sm hover:bg-forest-light transition-all flex items-center space-x-2 border border-forest-dark shadow-md disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving Draft...' : 'Save as Draft & Finish'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
