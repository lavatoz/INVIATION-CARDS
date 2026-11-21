import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { PublicWeddingInvitation, PublicMediaItem } from '../types';
import { UpiCheckoutModal } from '../components/GiftManagement/UpiCheckoutModal';
import {
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  Heart,
  Users,
  ChevronDown,
  X,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Gift,
  IndianRupee,
  Award,
  Phone,
  Mail,
  CheckCircle2,
  Tag,
} from 'lucide-react';

interface PublicInvitationPageProps {
  slug: string;
  onNavigateHome?: () => void;
}

type Lang = 'en' | 'ml';

export const PublicInvitationPage: React.FC<PublicInvitationPageProps> = ({
  slug,
  onNavigateHome,
}) => {
  const [invitation, setInvitation] = useState<PublicWeddingInvitation | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>('en');

  // Lightbox Modal State
  const [activePhoto, setActivePhoto] = useState<PublicMediaItem | null>(null);

  // Live UPI Checkout Modal State
  const [activeCheckoutSession, setActiveCheckoutSession] = useState<{
    contributionId: string;
    orderId: string;
    amount: number;
    contributorName: string;
    upiUri?: string | null;
    checkoutUrl?: string | null;
    payeeVpa?: string | null;
    payeeName?: string | null;
  } | null>(null);

  // Gift Contribution Form State
  const [selectedGiftAmount, setSelectedGiftAmount] = useState<number | 'custom'>(500);
  const [customGiftAmount, setCustomGiftAmount] = useState<string>('');
  const [contributorName, setContributorName] = useState<string>('');
  const [contributorPhone, setContributorPhone] = useState<string>('');
  const [contributorEmail, setContributorEmail] = useState<string>('');
  const [giftWishes, setGiftWishes] = useState<string>('');
  const [isSubmittingGift, setIsSubmittingGift] = useState<boolean>(false);
  const [giftFeedback, setGiftFeedback] = useState<{
    success: boolean;
    gatewayConfigured?: boolean;
    message: string;
  } | null>(null);

  // Private Guest Registration Form State
  const [guestRegName, setGuestRegName] = useState<string>('');
  const [guestRegAddress, setGuestRegAddress] = useState<string>('');
  const [guestRegMobile, setGuestRegMobile] = useState<string>('');
  const [guestRegSide, setGuestRegSide] = useState<'BRIDE' | 'GROOM' | ''>('');
  const [guestRegNote, setGuestRegNote] = useState<string>('');
  const [isSubmittingGuestReg, setIsSubmittingGuestReg] = useState<boolean>(false);
  const [guestRegFeedback, setGuestRegFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [isGuestRegSubmitted, setIsGuestRegSubmitted] = useState<boolean>(false);

  const handleGuestRegSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestRegName.trim()) {
      setGuestRegFeedback({
        success: false,
        message: lang === 'ml' ? 'ദയവായി താങ്കളുടെ പേര് രേഖപ്പെടുത്തുക.' : 'Please enter your name.',
      });
      return;
    }

    if (!guestRegSide) {
      setGuestRegFeedback({
        success: false,
        message:
          lang === 'ml'
            ? 'വരന്റെ ഭാഗമാണോ വധുവിന്റെ ഭാഗമാണോ എന്ന് തിരഞ്ഞെടുക്കുക.'
            : "Please specify whether you are joining from Bride's side or Groom's side.",
      });
      return;
    }

    if (guestRegNote.length > 1000) {
      setGuestRegFeedback({
        success: false,
        message: lang === 'ml' ? 'സന്ദേശം 1,000 അക്ഷരങ്ങളിൽ കവിയരുത്.' : 'Note cannot exceed 1,000 characters.',
      });
      return;
    }

    setIsSubmittingGuestReg(true);
    setGuestRegFeedback(null);
    try {
      const res = await api.registerGuestPublic(slug, {
        fullName: guestRegName.trim(),
        address: guestRegAddress.trim() || null,
        mobileNumber: guestRegMobile.trim() || null,
        side: guestRegSide as 'BRIDE' | 'GROOM',
        note: guestRegNote.trim() || null,
      });

      if (res.success) {
        setIsGuestRegSubmitted(true);
        setGuestRegFeedback({
          success: true,
          message:
            lang === 'ml'
              ? 'താങ്കളുടെ വിവരങ്ങൾ വിജയകരമായി രേഖപ്പെടുത്തി! സാന്നിധ്യത്തിനും ആശംസകൾക്കും നന്ദി.'
              : 'Thank you! Your response and warm wishes have been safely conveyed to the couple.',
        });
      } else {
        setGuestRegFeedback({
          success: false,
          message: res.message || 'Failed to submit response.',
        });
      }
    } catch (err: any) {
      setGuestRegFeedback({
        success: false,
        message: err.message || 'An error occurred while submitting your response.',
      });
    } finally {
      setIsSubmittingGuestReg(false);
    }
  };

  const handleGiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributorName.trim()) {
      setGiftFeedback({
        success: false,
        message: lang === 'ml' ? 'ദയവായി താങ്കളുടെ പേര് രേഖപ്പെടുത്തുക.' : 'Please enter your name.',
      });
      return;
    }

    const finalAmount =
      selectedGiftAmount === 'custom'
        ? parseFloat(customGiftAmount)
        : selectedGiftAmount;

    if (!finalAmount || isNaN(finalAmount) || finalAmount <= 0) {
      setGiftFeedback({
        success: false,
        message:
          lang === 'ml'
            ? 'സാധുവായ ഒരു തുക തിരഞ്ഞെടുക്കുക.'
            : 'Please select or enter a valid contribution amount.',
      });
      return;
    }

    setIsSubmittingGift(true);
    setGiftFeedback(null);
    try {
      const res = await api.initiateGiftContribution(slug, {
        contributorName: contributorName.trim(),
        contributorPhone: contributorPhone.trim() || null,
        contributorEmail: contributorEmail.trim() || null,
        amount: finalAmount,
        wishes: giftWishes.trim() || null,
      });

      if (!res.gatewayConfigured) {
        setGiftFeedback({
          success: true,
          gatewayConfigured: false,
          message:
            lang === 'ml'
              ? 'ഓൺലൈൻ സമ്മാന പേയ്‌മെന്റുകൾ നിലവിൽ ക്രമീകരിച്ചുവരികയാണ്. താങ്കളുടെ അനുഗ്രഹങ്ങൾക്ക് ഹൃദയം നിറഞ്ഞ നന്ദി. വിവാഹ വേദിയിൽ നേരിട്ടെത്തി ആശംസകൾ അറിയിക്കാവുന്നതാണ്.'
              : 'Online gift payments are currently being configured by the hosts. We warmly appreciate your blessings, and you may convey them in person at the wedding.',
        });
      } else if (res.data) {
        // Open live interactive YouPI PG UPI checkout modal
        setActiveCheckoutSession({
          contributionId: res.data.contributionId,
          orderId: res.data.orderId,
          amount: res.data.amount,
          contributorName: contributorName.trim(),
          upiUri: res.data.upiUri,
          checkoutUrl: res.data.checkoutUrl,
          payeeVpa: res.data.payeeVpa,
          payeeName: res.data.payeeName,
        });

        // Reset form inputs after opening checkout
        setGiftWishes('');
      }
    } catch (err: any) {
      setGiftFeedback({
        success: false,
        message:
          err.message ||
          (lang === 'ml'
            ? 'പ്രക്രിയ പൂർത്തിയാക്കാൻ സാധിച്ചില്ല. ദയവായി വീണ്ടും ശ്രമിക്കുക.'
            : 'Could not process contribution. Please try again.'),
      });
    } finally {
      setIsSubmittingGift(false);
    }
  };

  useEffect(() => {
    const fetchPublicInvitation = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await api.getPublicInvitation(slug);
        if (res.success && res.data?.invitation) {
          setInvitation(res.data.invitation);
        } else {
          setError(
            'This wedding invitation is not currently published or is unavailable.'
          );
        }
      } catch (err: any) {
        setError(
          err.message ||
            'This wedding invitation is currently in draft mode or does not exist.'
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) {
      fetchPublicInvitation();
    }
  }, [slug]);

  // Fallback text resolver
  const t = (en?: string | null, ml?: string | null, fallback: string = ''): string => {
    if (lang === 'ml') {
      return ml?.trim() || en?.trim() || fallback;
    }
    return en?.trim() || ml?.trim() || fallback;
  };

  // Date countdown calculator
  const getDaysUntilWedding = (dateStr?: string | null): number | null => {
    if (!dateStr) return null;
    const diffTime = new Date(dateStr).getTime() - new Date().getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Format date nicely
  const formatWeddingDate = (dateStr?: string | null): string => {
    if (!dateStr) return lang === 'ml' ? 'തീയതി ഉടൻ അറിയിക്കും' : 'Date to be announced';
    const d = new Date(dateStr);
    if (lang === 'ml') {
      const monthsMl = [
        'ജനുവരി',
        'ഫെബ്രുവരി',
        'മാർച്ച്',
        'ഏപ്രിൽ',
        'മേയ്',
        'ജൂൺ',
        'ജൂലൈ',
        'ഓഗസ്റ്റ്',
        'സെപ്റ്റംബർ',
        'ഒക്ടോബർ',
        'നവംബർ',
        'ഡിസംബർ',
      ];
      return `${d.getDate()} ${monthsMl[d.getMonth()]} ${d.getFullYear()}`;
    }
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // LOADING STATE
  if (isLoading) {
    return (
      <div className="min-h-screen bg-ivory flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full border border-sand-border bg-ivory-surface flex items-center justify-center shadow-sm mb-6 animate-pulse">
          <span className="font-serif text-2xl text-forest font-bold">വി</span>
        </div>
        <h2 className="font-serif text-2xl text-forest tracking-wide mb-2">
          {lang === 'ml' ? 'ക്ഷണക്കത്ത് ഒരുങ്ങുന്നു...' : 'Opening Sacred Invitation...'}
        </h2>
        <p className="text-xs text-charcoal-muted tracking-widest uppercase">
          Swiss Editorial · Kerala Heritage
        </p>
      </div>
    );
  }

  // ERROR / DRAFT / NOT FOUND STATE
  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-ivory flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-ivory-surface p-8 sm:p-10 rounded-sm border border-sand-border shadow-sm space-y-6">
          <div className="w-12 h-12 mx-auto rounded-full bg-sand/30 border border-sand-border flex items-center justify-center text-forest">
            <AlertCircle className="w-6 h-6 text-forest" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-serif text-forest">
              {lang === 'ml' ? 'ക്ഷണക്കത്ത് ലഭ്യമല്ല' : 'Invitation Unavailable'}
            </h2>
            <p className="text-xs text-charcoal-muted leading-relaxed">
              {lang === 'ml'
                ? 'ഈ വിവാഹ ക്ഷണക്കത്ത് നിലവിൽ ലഭ്യമല്ല അല്ലെങ്കിൽ ഡ്രാഫ്റ്റ് മോഡിലാണ്.'
                : error || 'This wedding invitation is either unpublished or does not exist.'}
            </p>
          </div>

          <div className="pt-2 border-t border-sand-border/60">
            {onNavigateHome && (
              <button
                onClick={onNavigateHome}
                className="px-6 py-2.5 bg-forest text-ivory text-xs uppercase tracking-widest font-semibold rounded-sm hover:bg-forest-light transition-all inline-flex items-center space-x-2"
              >
                <span>{lang === 'ml' ? 'ഹോം പേജിലേക്ക്' : 'Return Home'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const couple = invitation.coupleDetails;
  const groomName = t(couple?.partner1NameEn, couple?.partner1NameMl, 'Groom');
  const brideName = t(couple?.partner2NameEn, couple?.partner2NameMl, 'Bride');
  const pageTitle = t(invitation.titleEn, invitation.titleMl, `${groomName} & ${brideName}`);
  const daysLeft = getDaysUntilWedding(invitation.weddingDate);

  const groomFamily = (invitation.familyMembers || []).filter(
    (m) => m.side === 'GROOM'
  );
  const brideFamily = (invitation.familyMembers || []).filter(
    (m) => m.side === 'BRIDE'
  );
  const commonFamily = (invitation.familyMembers || []).filter(
    (m) => m.side === 'BOTH'
  );

  return (
    <div
      className={`min-h-screen bg-ivory text-charcoal selection:bg-sand selection:text-forest ${
        lang === 'ml' ? 'font-malayalam' : 'font-sans'
      }`}
    >
      {/* FLOATING HEADER CONTROLS (Language Switcher) */}
      <header className="sticky top-0 z-50 bg-ivory/90 backdrop-blur-md border-b border-sand-border/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-7 h-7 rounded-full bg-forest text-ivory font-serif text-sm flex items-center justify-center border border-sand">
              വി
            </span>
            <span className="font-serif text-base tracking-tight text-forest font-semibold hidden sm:inline">
              {groomName} & {brideName}
            </span>
          </div>

          {/* Bilingual Language Switcher Toggle */}
          <div className="flex items-center space-x-1.5 p-1 bg-sand/40 border border-sand-border rounded-full shadow-inner">
            <button
              onClick={() => setLang('en')}
              className={`px-3 py-1 rounded-full text-[11px] font-sans uppercase tracking-wider font-semibold transition-all ${
                lang === 'en'
                  ? 'bg-forest text-ivory shadow-sm'
                  : 'text-charcoal hover:text-forest'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLang('ml')}
              className={`px-3 py-1 rounded-full text-[12px] font-malayalam tracking-normal font-semibold transition-all ${
                lang === 'ml'
                  ? 'bg-forest text-ivory shadow-sm'
                  : 'text-charcoal hover:text-forest'
              }`}
            >
              മലയാളം
            </button>
          </div>
        </div>
      </header>

      {/* SECTION A: OPENING WEDDING CARD (HERO) */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-4 sm:px-6 py-16 overflow-hidden">
        {/* Subtle geometric background accents */}
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-sand-border/50"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] rounded-full border border-sand-border/30"></div>
        </div>

        <div className="relative z-10 max-w-3xl mx-auto space-y-8 animate-fadeIn">
          {/* Traditional Auspicious Invocation Badge */}
          <div className="inline-flex items-center space-x-2 px-4 py-1 rounded-full bg-sand/50 border border-sand-border text-xs uppercase tracking-widest text-forest font-medium">
            <Sparkles className="w-3.5 h-3.5 text-forest" />
            <span>
              {lang === 'ml'
                ? 'ഹരിഃ ശ്രീ ഗണപതയേ നമഃ · ശുഭവിവാഹം'
                : 'Sacred Union · Auspicious Celebration'}
            </span>
          </div>

          {/* Invitation Lead */}
          <p className="text-xs sm:text-sm uppercase tracking-editorial text-charcoal-muted">
            {lang === 'ml'
              ? 'കുടുംബാംഗങ്ങളുടെ അനുഗ്രഹാശിസ്സുകളോടെ സാദരം ക്ഷണിക്കുന്നു'
              : 'With the blessings of parents and elders, we invite you to celebrate'}
          </p>

          {/* Grand Couple Names */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif text-forest tracking-tight leading-[1.08] font-normal">
              {groomName}
              <span className="block font-serif italic text-charcoal font-light text-2xl sm:text-4xl my-2">
                {lang === 'ml' ? 'കൂടാതെ' : '&'}
              </span>
              {brideName}
            </h1>

            {pageTitle && pageTitle !== `${groomName} & ${brideName}` && (
              <p className="font-serif text-lg sm:text-xl text-charcoal-muted italic pt-2">
                "{pageTitle}"
              </p>
            )}
          </div>

          {/* Date & Countdown */}
          <div className="pt-4 pb-2">
            <div className="inline-block p-4 sm:p-6 bg-ivory-surface/90 border border-sand-border rounded-sm shadow-sm">
              <div className="flex items-center justify-center space-x-2 text-forest mb-1">
                <Calendar className="w-4 h-4" />
                <span className="font-serif text-lg sm:text-xl font-bold tracking-wide">
                  {formatWeddingDate(invitation.weddingDate)}
                </span>
              </div>

              {daysLeft !== null && (
                <p className="text-[11px] font-mono uppercase tracking-widest text-charcoal-muted mt-1">
                  {daysLeft > 0
                    ? lang === 'ml'
                      ? `മംഗല്യ ദിനത്തിലേക്ക് ഇനി ${daysLeft} നാളുകൾ`
                      : `${daysLeft} days until the sacred celebration`
                    : daysLeft === 0
                    ? lang === 'ml'
                      ? 'ഇന്നാണ് മംഗല്യ ദിനം!'
                      : 'Today is the sacred union!'
                    : lang === 'ml'
                    ? 'മംഗല്യം സമാപിച്ചു'
                    : 'The celebration has taken place'}
                </p>
              )}
            </div>
          </div>

          {/* Scroll Down Indicator */}
          <div className="pt-8 flex flex-col items-center space-y-2 opacity-80 hover:opacity-100 transition-opacity">
            <span className="text-[10px] uppercase tracking-widest text-charcoal-muted font-mono">
              {lang === 'ml' ? 'വിശേഷങ്ങൾ അറിയാൻ താഴേക്ക് സ്ക്രോൾ ചെയ്യുക' : 'Scroll to explore celebration'}
            </span>
            <ChevronDown className="w-4 h-4 text-forest animate-bounce" />
          </div>
        </div>
      </section>

      {/* EDITORIAL DIVIDER */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-center space-x-4 py-8">
          <div className="h-[1px] bg-sand-border flex-1"></div>
          <span className="text-forest text-xs tracking-widest uppercase font-serif">✦ · ✦ · ✦</span>
          <div className="h-[1px] bg-sand-border flex-1"></div>
        </div>
      </div>

      {/* SECTION B: COUPLE INTRODUCTION & LOVE STORY */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-12">
        <div className="text-center space-y-2">
          <span className="text-[10px] uppercase tracking-widest text-forest font-semibold block">
            {lang === 'ml' ? 'വധൂവരന്മാർ' : 'The Betrothed'}
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif text-charcoal">
            {lang === 'ml' ? 'വരനും വധുവും' : 'The Bride & Groom'}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Groom Card */}
          <div className="p-8 bg-ivory-surface border border-sand-border rounded-sm space-y-4 text-center sm:text-left flex flex-col justify-between shadow-sm">
            <div className="space-y-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-forest font-bold px-2.5 py-1 bg-sand/30 border border-sand-border rounded inline-block">
                {lang === 'ml' ? 'വരൻ' : 'The Groom'}
              </span>
              <h3 className="text-2xl font-serif text-forest font-bold">
                {groomName}
              </h3>

              {t(couple?.partner1TitleEn, couple?.partner1TitleMl) && (
                <p className="text-xs uppercase tracking-wider text-charcoal font-semibold">
                  {t(couple?.partner1TitleEn, couple?.partner1TitleMl)}
                </p>
              )}

              {t(couple?.partner1BioEn, couple?.partner1BioMl) && (
                <p className="text-xs text-charcoal-muted leading-relaxed pt-2">
                  {t(couple?.partner1BioEn, couple?.partner1BioMl)}
                </p>
              )}
            </div>
          </div>

          {/* Bride Card */}
          <div className="p-8 bg-ivory-surface border border-sand-border rounded-sm space-y-4 text-center sm:text-left flex flex-col justify-between shadow-sm">
            <div className="space-y-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-forest font-bold px-2.5 py-1 bg-sand/30 border border-sand-border rounded inline-block">
                {lang === 'ml' ? 'വധു' : 'The Bride'}
              </span>
              <h3 className="text-2xl font-serif text-forest font-bold">
                {brideName}
              </h3>

              {t(couple?.partner2TitleEn, couple?.partner2TitleMl) && (
                <p className="text-xs uppercase tracking-wider text-charcoal font-semibold">
                  {t(couple?.partner2TitleEn, couple?.partner2TitleMl)}
                </p>
              )}

              {t(couple?.partner2BioEn, couple?.partner2BioMl) && (
                <p className="text-xs text-charcoal-muted leading-relaxed pt-2">
                  {t(couple?.partner2BioEn, couple?.partner2BioMl)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Joint Story / Introduction */}
        {t(couple?.storyEn, couple?.storyMl) && (
          <div className="p-8 sm:p-10 bg-ivory-surface border border-sand-border rounded-sm text-center space-y-4 max-w-3xl mx-auto shadow-sm">
            <Heart className="w-5 h-5 text-forest mx-auto" />
            <h3 className="font-serif text-2xl text-forest">
              {lang === 'ml' ? 'ഞങ്ങളുടെ കഥയും കുടുംബാനുഗ്രഹവും' : 'Our Story & Shared Journey'}
            </h3>
            <p className="text-sm text-charcoal-muted leading-relaxed max-w-2xl mx-auto italic font-serif">
              "{t(couple?.storyEn, couple?.storyMl)}"
            </p>
          </div>
        )}
      </section>

      {/* SECTION C: FAMILY LINEAGE & ELDERS */}
      {((invitation.familyMembers && invitation.familyMembers.length > 0)) && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10">
          <div className="text-center space-y-2">
            <span className="text-[10px] uppercase tracking-widest text-forest font-semibold block">
              {lang === 'ml' ? 'പാരമ്പര്യം' : 'Heritage & Blessings'}
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif text-charcoal">
              {lang === 'ml' ? 'കുടുംബാംഗങ്ങളും മുതിർന്നവരും' : 'Family & Respected Elders'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Groom's Family */}
            {groomFamily.length > 0 && (
              <div className="space-y-4">
                <div className="border-b border-sand-border pb-2">
                  <h3 className="font-serif text-lg text-forest font-bold flex items-center space-x-2">
                    <Users className="w-4 h-4 text-forest" />
                    <span>
                      {lang === 'ml' ? 'വരന്റെ കുടുംബം' : "Groom's Family"}
                    </span>
                  </h3>
                </div>

                <div className="space-y-3">
                  {groomFamily.map((fam) => (
                    <div
                      key={fam.id}
                      className="p-4 bg-ivory-surface border border-sand-border rounded-sm space-y-1"
                    >
                      <div className="flex justify-between items-baseline">
                        <span className="font-bold text-sm text-charcoal">
                          {t(fam.nameEn, fam.nameMl)}
                        </span>
                        <span className="text-[11px] font-mono text-forest uppercase tracking-wider">
                          {t(fam.relationEn, fam.relationMl)}
                        </span>
                      </div>
                      {t(fam.descriptionEn, fam.descriptionMl) && (
                        <p className="text-xs text-charcoal-muted italic">
                          {t(fam.descriptionEn, fam.descriptionMl)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bride's Family */}
            {brideFamily.length > 0 && (
              <div className="space-y-4">
                <div className="border-b border-sand-border pb-2">
                  <h3 className="font-serif text-lg text-forest font-bold flex items-center space-x-2">
                    <Users className="w-4 h-4 text-forest" />
                    <span>
                      {lang === 'ml' ? 'വധുവിന്റെ കുടുംബം' : "Bride's Family"}
                    </span>
                  </h3>
                </div>

                <div className="space-y-3">
                  {brideFamily.map((fam) => (
                    <div
                      key={fam.id}
                      className="p-4 bg-ivory-surface border border-sand-border rounded-sm space-y-1"
                    >
                      <div className="flex justify-between items-baseline">
                        <span className="font-bold text-sm text-charcoal">
                          {t(fam.nameEn, fam.nameMl)}
                        </span>
                        <span className="text-[11px] font-mono text-forest uppercase tracking-wider">
                          {t(fam.relationEn, fam.relationMl)}
                        </span>
                      </div>
                      {t(fam.descriptionEn, fam.descriptionMl) && (
                        <p className="text-xs text-charcoal-muted italic">
                          {t(fam.descriptionEn, fam.descriptionMl)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Common Elders */}
          {commonFamily.length > 0 && (
            <div className="pt-4 max-w-2xl mx-auto space-y-3">
              <h3 className="font-serif text-center text-lg text-forest font-bold">
                {lang === 'ml' ? 'മുതിർന്നവർ' : 'Respected Elders & Patrons'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {commonFamily.map((fam) => (
                  <div
                    key={fam.id}
                    className="p-3.5 bg-ivory-surface border border-sand-border rounded-sm text-center"
                  >
                    <span className="font-bold text-sm text-charcoal block">
                      {t(fam.nameEn, fam.nameMl)}
                    </span>
                    <span className="text-xs text-charcoal-muted block">
                      {t(fam.relationEn, fam.relationMl)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* EDITORIAL DIVIDER */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-center space-x-4 py-8">
          <div className="h-[1px] bg-sand-border flex-1"></div>
          <span className="text-forest text-xs tracking-widest uppercase font-serif">✦ · ✦ · ✦</span>
          <div className="h-[1px] bg-sand-border flex-1"></div>
        </div>
      </div>

      {/* SECTION D: CEREMONIAL SCHEDULE & EVENTS */}
      {((invitation.events && invitation.events.length > 0)) && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10">
          <div className="text-center space-y-2">
            <span className="text-[10px] uppercase tracking-widest text-forest font-semibold block">
              {lang === 'ml' ? 'സമയക്രമം' : 'Auspicious Timeline'}
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif text-charcoal">
              {lang === 'ml' ? 'വിവാഹ ചടങ്ങുകൾ' : 'Ceremonial Events & Schedule'}
            </h2>
          </div>

          <div className="space-y-6">
            {invitation.events.map((ev, index) => {
              const evTitle = t(ev.titleEn, ev.titleMl, 'Ceremony');
              const evDesc = t(ev.descriptionEn, ev.descriptionMl);
              const dressCode = t(ev.dressCodeEn, ev.dressCodeMl);
              const startDate = new Date(ev.startTime);

              return (
                <div
                  key={ev.id}
                  className="p-6 sm:p-8 bg-ivory-surface border border-sand-border rounded-sm shadow-sm space-y-4 hover:border-forest/50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-sand-border/60 pb-3 gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-mono tracking-widest text-forest font-semibold block mb-1">
                        {lang === 'ml' ? `ചടങ്ങ് #${index + 1}` : `Ceremony #${index + 1}`} ·{' '}
                        {ev.eventType || 'Ritual'}
                      </span>
                      <h3 className="font-serif text-2xl text-forest font-bold">
                        {evTitle}
                      </h3>
                    </div>

                    <div className="flex items-center space-x-2 text-xs font-mono text-charcoal bg-sand/30 px-3 py-1.5 rounded border border-sand-border w-fit">
                      <Clock className="w-3.5 h-3.5 text-forest" />
                      <span>
                        {startDate.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {ev.endTime &&
                          ` - ${new Date(ev.endTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}`}
                      </span>
                    </div>
                  </div>

                  {evDesc && (
                    <p className="text-xs text-charcoal-muted leading-relaxed font-sans">
                      {evDesc}
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs text-charcoal-muted border-t border-sand-border/40">
                    {dressCode && (
                      <div className="flex items-start space-x-2">
                        <span className="font-bold text-charcoal uppercase tracking-wider text-[10px] min-w-[70px]">
                          {lang === 'ml' ? 'വേഷം:' : 'Attire:'}
                        </span>
                        <span>{dressCode}</span>
                      </div>
                    )}

                    {ev.venue && (
                      <div className="flex items-start space-x-2 sm:justify-end">
                        <MapPin className="w-3.5 h-3.5 text-forest flex-shrink-0 mt-0.5" />
                        <span className="font-medium text-forest">
                          {t(ev.venue.nameEn, ev.venue.nameMl)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* EDITORIAL DIVIDER */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-center space-x-4 py-8">
          <div className="h-[1px] bg-sand-border flex-1"></div>
          <span className="text-forest text-xs tracking-widest uppercase font-serif">✦ · ✦ · ✦</span>
          <div className="h-[1px] bg-sand-border flex-1"></div>
        </div>
      </div>

      {/* SECTION E: VENUES & GEOGRAPHIC LOCATION */}
      {((invitation.venues && invitation.venues.length > 0)) && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10">
          <div className="text-center space-y-2">
            <span className="text-[10px] uppercase tracking-widest text-forest font-semibold block">
              {lang === 'ml' ? 'സ്ഥാനം' : 'Destinations'}
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif text-charcoal">
              {lang === 'ml' ? 'വിവാഹ വേദി' : 'Location & Venues'}
            </h2>
          </div>

          <div className="space-y-6">
            {invitation.venues.map((venue) => {
              const vName = t(venue.nameEn, venue.nameMl, 'Wedding Venue');
              const vAddr = t(venue.addressEn, venue.addressMl);
              const vLandmark = t(venue.landmarkEn, venue.landmarkMl);

              return (
                <div
                  key={venue.id}
                  className="p-8 bg-ivory-surface border border-sand-border rounded-sm shadow-sm space-y-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="font-serif text-2xl text-forest font-bold">
                        {vName}
                      </h3>
                      <p className="text-xs text-charcoal-muted leading-relaxed max-w-lg">
                        {vAddr}
                        {venue.district && `, ${venue.district}`}
                        {venue.state && `, ${venue.state}`}
                        {venue.pincode && ` - ${venue.pincode}`}
                      </p>
                      {vLandmark && (
                        <p className="text-[11px] text-charcoal-muted italic pt-1">
                          {lang === 'ml' ? 'അടയാളം:' : 'Landmark:'} {vLandmark}
                        </p>
                      )}
                    </div>

                    {venue.googleMapsUrl && (
                      <a
                        href={venue.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-5 py-3 bg-forest text-ivory text-xs uppercase tracking-widest font-semibold rounded-sm hover:bg-forest-light transition-all inline-flex items-center space-x-2 border border-forest-dark shadow-sm self-start sm:self-center"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>
                          {lang === 'ml' ? 'ഗൂഗിൾ മാപ്പിൽ കാണുക' : 'Open in Google Maps'}
                        </span>
                        <ExternalLink className="w-3 h-3 ml-0.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SECTION F: PHOTO GALLERY (LIGHTBOX MODAL) */}
      {invitation.media && invitation.media.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-10">
          <div className="text-center space-y-2">
            <span className="text-[10px] uppercase tracking-widest text-forest font-semibold block">
              {lang === 'ml' ? 'ചിത്രങ്ങൾ' : 'Memories'}
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif text-charcoal">
              {lang === 'ml' ? 'മനോഹര നിമിഷങ്ങൾ' : 'Moments & Photographs'}
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {invitation.media.map((item) => (
              <div
                key={item.id}
                onClick={() => setActivePhoto(item)}
                className="group relative aspect-square bg-sand/20 border border-sand-border rounded-sm overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all"
              >
                <img
                  src={item.url}
                  alt={t(item.captionEn, item.captionMl, 'Wedding Photograph')}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    // Handle missing disk image gracefully
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-forest/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                  <span className="text-xs uppercase tracking-widest text-ivory font-serif">
                    {lang === 'ml' ? 'വലുതായി കാണുക' : 'View Full Image'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* LIGHTBOX MODAL */}
      {activePhoto && (
        <div className="fixed inset-0 z-50 bg-charcoal/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-[90vh] bg-ivory rounded-sm border border-sand p-2 shadow-2xl flex flex-col items-center">
            <button
              onClick={() => setActivePhoto(null)}
              className="absolute -top-10 right-0 text-ivory hover:text-sand text-xs uppercase tracking-widest flex items-center space-x-1"
            >
              <X className="w-5 h-5" />
              <span>{lang === 'ml' ? 'അടയ്ക്കുക' : 'Close'}</span>
            </button>
            <img
              src={activePhoto.url}
              alt="Full Preview"
              className="max-h-[80vh] w-auto object-contain rounded-sm"
            />
            {t(activePhoto.captionEn, activePhoto.captionMl) && (
              <p className="text-xs text-charcoal text-center mt-2 italic font-serif">
                {t(activePhoto.captionEn, activePhoto.captionMl)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* SECTION G: PRIVATE GUEST REGISTRATION ("We'd Love to Have You With Us") */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-ivory-surface border border-sand-border rounded-sm p-6 sm:p-10 shadow-sm space-y-8">
          {/* Section Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-sand/40 border border-sand-border text-[11px] uppercase tracking-widest text-forest font-semibold">
              <Heart className="w-3.5 h-3.5 text-forest" />
              <span>{lang === 'ml' ? 'സാന്നിധ്യം അറിയിക്കാം' : 'Guest Response'}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif text-forest font-bold">
              {lang === 'ml' ? 'ഞങ്ങളോടൊപ്പം പങ്കുചേരൂ' : "We'd Love to Have You With Us"}
            </h2>
            <p className="text-xs sm:text-sm text-charcoal-muted leading-relaxed max-w-xl mx-auto">
              {lang === 'ml'
                ? 'ഞങ്ങളുടെ ഈ സന്തോഷദിനത്തിൽ താങ്കളുടെ സാന്നിധ്യം അവിസ്മരണീയമാകും. ദയവായി താങ്കളുടെ വിവരങ്ങൾ ഞങ്ങളുമായി പങ്കുവെക്കുക.'
                : 'Your presence would make our special day even more memorable. Kindly share your details with us.'}
            </p>
          </div>

          {/* Polite Confirmation Message */}
          {isGuestRegSubmitted ? (
            <div className="p-8 bg-sand/20 border border-sand-border rounded-sm text-center space-y-4 animate-fadeIn">
              <div className="w-12 h-12 mx-auto rounded-full bg-forest text-ivory flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-xl font-bold text-forest">
                  {lang === 'ml' ? 'ഹൃദയം നിറഞ്ഞ നന്ദി!' : 'Thank You!'}
                </h3>
                <p className="text-xs text-charcoal-muted max-w-md mx-auto leading-relaxed">
                  {guestRegFeedback?.message ||
                    (lang === 'ml'
                      ? 'താങ്കളുടെ വിവരങ്ങൾ വിജയകരമായി രേഖപ്പെടുത്തി. വിവാഹവേദിയിൽ കാണാൻ ഞങ്ങൾ ആകാംക്ഷയോടെ കാത്തിരിക്കുന്നു!'
                      : 'Your details have been warmly received. We eagerly look forward to celebrating together!')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsGuestRegSubmitted(false);
                  setGuestRegName('');
                  setGuestRegAddress('');
                  setGuestRegMobile('');
                  setGuestRegSide('');
                  setGuestRegNote('');
                  setGuestRegFeedback(null);
                }}
                className="inline-flex items-center space-x-1.5 text-xs text-forest underline hover:text-forest-light font-medium pt-2"
              >
                <span>{lang === 'ml' ? 'മറ്റൊരു പ്രതികരണം സമർപ്പിക്കുക' : 'Submit another response'}</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleGuestRegSubmit} className="space-y-6">
              {/* Feedback Alert */}
              {guestRegFeedback && !guestRegFeedback.success && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-900 rounded-sm text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{guestRegFeedback.message}</span>
                </div>
              )}

              {/* 1. Name (Required) */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1.5">
                  {lang === 'ml' ? 'പൂർണ്ണ നാമം *' : 'Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={guestRegName}
                  onChange={(e) => setGuestRegName(e.target.value)}
                  placeholder={lang === 'ml' ? 'ഉദാ. രാഹുൽ മേനോൻ / സ്നേഹിതൻ' : 'e.g. Rahul Menon / Anjali Nair'}
                  className="w-full px-3.5 py-2.5 bg-ivory border border-sand-border rounded-sm text-xs text-charcoal placeholder-charcoal-muted/60 focus:outline-none focus:border-forest"
                />
              </div>

              {/* 2. Which side are you joining us from? (Required) */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-2">
                  {lang === 'ml'
                    ? 'ഏതു ഭാഗത്തുനിന്നാണ് താങ്കൾ പങ്കെടുക്കുന്നത്? *'
                    : 'Which side are you joining us from? *'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setGuestRegSide('BRIDE')}
                    className={`p-3.5 border rounded-sm text-left flex items-center justify-between transition-all cursor-pointer ${
                      guestRegSide === 'BRIDE'
                        ? 'bg-sand/40 border-forest text-forest shadow-xs'
                        : 'bg-ivory border-sand-border text-charcoal hover:border-forest/40'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <span className="text-xs font-serif font-bold block">
                        {lang === 'ml' ? "വധുവിന്റെ ഭാഗം (Bride's Side)" : "Bride's Side"}
                      </span>
                      <span className="text-[10px] text-charcoal-muted block">
                        {lang === 'ml' ? 'വധുവിന്റെ കുടുംബം / സുഹൃത്തുക്കൾ' : "Family, friends & guests of the bride"}
                      </span>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        guestRegSide === 'BRIDE' ? 'border-forest bg-forest text-ivory' : 'border-sand-border bg-white'
                      }`}
                    >
                      {guestRegSide === 'BRIDE' && <span className="w-1.5 h-1.5 rounded-full bg-ivory"></span>}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGuestRegSide('GROOM')}
                    className={`p-3.5 border rounded-sm text-left flex items-center justify-between transition-all cursor-pointer ${
                      guestRegSide === 'GROOM'
                        ? 'bg-sand/40 border-forest text-forest shadow-xs'
                        : 'bg-ivory border-sand-border text-charcoal hover:border-forest/40'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <span className="text-xs font-serif font-bold block">
                        {lang === 'ml' ? "വരന്റെ ഭാഗം (Groom's Side)" : "Groom's Side"}
                      </span>
                      <span className="text-[10px] text-charcoal-muted block">
                        {lang === 'ml' ? 'വരന്റെ കുടുംബം / സുഹൃത്തുക്കൾ' : "Family, friends & guests of the groom"}
                      </span>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        guestRegSide === 'GROOM' ? 'border-forest bg-forest text-ivory' : 'border-sand-border bg-white'
                      }`}
                    >
                      {guestRegSide === 'GROOM' && <span className="w-1.5 h-1.5 rounded-full bg-ivory"></span>}
                    </div>
                  </button>
                </div>
              </div>

              {/* 3. Mobile Number (Optional) & 4. Address (Optional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1.5">
                    {lang === 'ml' ? 'മൊബൈൽ നമ്പർ (ഐച്ഛികം)' : 'Mobile Number (Optional)'}
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 absolute left-3 top-3 text-charcoal-muted" />
                    <input
                      type="tel"
                      value={guestRegMobile}
                      onChange={(e) => setGuestRegMobile(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-ivory border border-sand-border rounded-sm text-xs text-charcoal placeholder-charcoal-muted/60 focus:outline-none focus:border-forest"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1.5">
                    {lang === 'ml' ? 'വിലാസം / സ്ഥലം (ഐച്ഛികം)' : 'Address (Optional)'}
                  </label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 absolute left-3 top-3 text-charcoal-muted" />
                    <input
                      type="text"
                      value={guestRegAddress}
                      onChange={(e) => setGuestRegAddress(e.target.value)}
                      placeholder={lang === 'ml' ? 'വീട്ടുപേര്, പ്രദേശം അല്ലെങ്കിൽ സ്ഥലം' : 'House, locality or town'}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-ivory border border-sand-border rounded-sm text-xs text-charcoal placeholder-charcoal-muted/60 focus:outline-none focus:border-forest"
                    />
                  </div>
                </div>
              </div>

              {/* 5. A Note for the Couple (Optional, Max 1000 Chars) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold">
                    {lang === 'ml' ? 'നവദമ്പതികൾക്കായി ഒരു സന്ദേശം (ഐച്ഛികം)' : 'A Note for the Couple (Optional)'}
                  </label>
                  <span className="text-[10px] font-mono text-charcoal-muted">
                    {1000 - guestRegNote.length} {lang === 'ml' ? 'അക്ഷരങ്ങൾ ബാക്കി' : 'characters remaining'}
                  </span>
                </div>
                <textarea
                  rows={4}
                  maxLength={1000}
                  value={guestRegNote}
                  onChange={(e) => setGuestRegNote(e.target.value)}
                  placeholder={
                    lang === 'ml'
                      ? 'നവദമ്പതികൾക്കായി താങ്കളുടെ ഹൃദ്യമായ ആശംസകൾ, പ്രാർത്ഥനകൾ, അല്ലെങ്കിൽ മറ്റ് വിവരങ്ങൾ ഇവിടെ രേഖപ്പെടുത്താം...'
                      : 'Write anything you wish — warm blessings, messages, memories or travel details for the couple...'
                  }
                  className="w-full p-3 bg-ivory border border-sand-border rounded-sm text-xs text-charcoal placeholder-charcoal-muted/60 focus:outline-none focus:border-forest leading-relaxed"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmittingGuestReg}
                className="w-full py-3.5 bg-forest text-ivory text-xs uppercase tracking-widest font-semibold rounded-sm hover:bg-forest-light transition-all flex items-center justify-center space-x-2 border border-forest-dark shadow-sm active:scale-[0.99] disabled:opacity-80 cursor-pointer"
              >
                <Heart className="w-4 h-4 text-ivory" />
                <span>
                  {isSubmittingGuestReg
                    ? (lang === 'ml' ? 'സമർപ്പിക്കുന്നു...' : 'Sending Response...')
                    : (lang === 'ml' ? 'വിവരങ്ങൾ സമർപ്പിക്കുക' : 'Send Response')}
                </span>
              </button>

              {/* Privacy Reassurance Note */}
              <p className="text-[10px] text-center text-charcoal-muted">
                {lang === 'ml'
                  ? '✦ താങ്കൾ പങ്കുവെക്കുന്ന വിവരങ്ങളും ആശംസകളും പൂർണ്ണമായും സ്വകാര്യമായി സൂക്ഷിക്കുന്നതാണ്.'
                  : '✦ Your details and personal notes are kept strictly private and will only be viewed by the wedding hosts.'}
              </p>
            </form>
          )}
        </div>
      </section>

      {/* SECTION H: GIFT CONTRIBUTION */}
      {invitation.enableGifts && (
        <>
          {/* EDITORIAL DIVIDER */}
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-center space-x-4 py-4">
              <div className="h-[1px] bg-sand-border flex-1"></div>
              <span className="text-forest text-xs tracking-widest uppercase font-serif">✦ · ✦ · ✦</span>
              <div className="h-[1px] bg-sand-border flex-1"></div>
            </div>
          </div>

          <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-sand/40 border border-sand-border text-[11px] uppercase tracking-widest text-forest font-semibold">
                <Gift className="w-3.5 h-3.5" />
                <span>{lang === 'ml' ? 'സ്നേഹോപഹാരം' : 'Voluntary Blessings'}</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-serif text-forest font-normal">
                {t(invitation.giftHeadingEn, invitation.giftHeadingMl, 'A Gift From the Heart')}
              </h2>
              <p className="text-xs sm:text-sm text-charcoal-muted leading-relaxed max-w-xl mx-auto italic font-serif">
                "{t(
                  invitation.giftIntroEn,
                  invitation.giftIntroMl,
                  'Your presence is the greatest gift. If you wish to contribute towards our new journey together, we would be grateful for your blessings and support.'
                )}"
              </p>
            </div>

            <div className="max-w-xl mx-auto p-6 sm:p-8 bg-ivory-surface border border-sand-border rounded-sm shadow-sm space-y-6">
              {giftFeedback && (
                <div
                  className={`p-4 rounded-sm text-xs space-y-1 transition-all ${
                    giftFeedback.success
                      ? 'bg-emerald-50 border border-emerald-300 text-emerald-950'
                      : 'bg-red-50 border border-red-300 text-red-950'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {giftFeedback.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-700 flex-shrink-0 mt-0.5" />
                    )}
                    <span className="leading-relaxed">{giftFeedback.message}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleGiftSubmit} className="space-y-5">
                {/* Amount Selection */}
                <div>
                  <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-2.5">
                    {lang === 'ml' ? 'സംഭാവന തുക തിരഞ്ഞെടുക്കുക (₹)' : 'Choose Contribution Amount (₹)'}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {(invitation.suggestedGiftAmounts && invitation.suggestedGiftAmounts.length > 0
                      ? invitation.suggestedGiftAmounts
                      : [200, 500, 2000]
                    ).map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          setSelectedGiftAmount(amt);
                          setCustomGiftAmount('');
                        }}
                        className={`py-2.5 px-3 rounded-sm border text-xs font-mono font-bold transition-all ${
                          selectedGiftAmount === amt
                            ? 'bg-forest text-ivory border-forest shadow-sm'
                            : 'bg-ivory border-sand-border text-charcoal hover:border-forest/50'
                        }`}
                      >
                        ₹{amt.toLocaleString('en-IN')}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setSelectedGiftAmount('custom')}
                      className={`py-2.5 px-3 rounded-sm border text-xs uppercase tracking-wider font-semibold transition-all ${
                        selectedGiftAmount === 'custom'
                          ? 'bg-forest text-ivory border-forest shadow-sm'
                          : 'bg-ivory border-sand-border text-charcoal hover:border-forest/50'
                      }`}
                    >
                      {lang === 'ml' ? 'മറ്റൊരു തുക' : 'Custom'}
                    </button>
                  </div>

                  {selectedGiftAmount === 'custom' && (
                    <div className="mt-3 relative">
                      <IndianRupee className="w-4 h-4 absolute left-3 top-2.5 text-charcoal-muted" />
                      <input
                        type="number"
                        min="1"
                        step="10"
                        value={customGiftAmount}
                        onChange={(e) => setCustomGiftAmount(e.target.value)}
                        placeholder={lang === 'ml' ? 'തുക രേഖപ്പെടുത്തുക' : 'Enter custom amount'}
                        className="w-full pl-9 pr-3 py-2 bg-ivory border border-sand-border rounded-sm text-xs font-mono text-charcoal focus:outline-none focus:border-forest"
                        required
                      />
                    </div>
                  )}
                </div>

                {/* Contributor Details */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1">
                      {lang === 'ml' ? 'താങ്കളുടെ പേര് *' : 'Your Full Name *'}
                    </label>
                    <input
                      type="text"
                      value={contributorName}
                      onChange={(e) => setContributorName(e.target.value)}
                      placeholder={lang === 'ml' ? 'പേര്' : 'Full name'}
                      className="w-full px-3 py-2 bg-ivory border border-sand-border rounded-sm text-xs text-charcoal focus:outline-none focus:border-forest"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1">
                        {lang === 'ml' ? 'ഫോൺ നമ്പർ' : 'Mobile Number'}
                      </label>
                      <input
                        type="tel"
                        value={contributorPhone}
                        onChange={(e) => setContributorPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full px-3 py-2 bg-ivory border border-sand-border rounded-sm text-xs text-charcoal focus:outline-none focus:border-forest"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1">
                        {lang === 'ml' ? 'ഇമെയിൽ (ഐച്ഛികം)' : 'Email (Optional)'}
                      </label>
                      <input
                        type="email"
                        value={contributorEmail}
                        onChange={(e) => setContributorEmail(e.target.value)}
                        placeholder="guest@example.com"
                        className="w-full px-3 py-2 bg-ivory border border-sand-border rounded-sm text-xs text-charcoal focus:outline-none focus:border-forest"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1">
                      {lang === 'ml' ? 'ആശംസാ സന്ദേശം' : 'Blessings & Personal Wishes'}
                    </label>
                    <textarea
                      rows={2}
                      value={giftWishes}
                      onChange={(e) => setGiftWishes(e.target.value)}
                      placeholder={
                        lang === 'ml'
                          ? 'നവദമ്പതികൾക്ക് താങ്കളുടെ ഹൃദ്യമായ ആശംസകൾ...'
                          : 'Write a warm blessing for the bride and groom...'
                      }
                      className="w-full p-2.5 bg-ivory border border-sand-border rounded-sm text-xs text-charcoal focus:outline-none focus:border-forest leading-relaxed"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingGift}
                  className="w-full py-3 bg-forest text-ivory text-xs uppercase tracking-widest font-semibold rounded-sm hover:bg-forest-light transition-all flex items-center justify-center space-x-2 border border-forest-dark shadow-sm"
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span>
                    {isSubmittingGift
                      ? lang === 'ml'
                        ? 'സമർപ്പിക്കുന്നു...'
                        : 'Processing...'
                      : lang === 'ml'
                      ? 'സമ്മാന സംഭാവന സമർപ്പിക്കുക'
                      : 'Contribute Blessings'}
                  </span>
                </button>

                <p className="text-[10px] text-center text-charcoal-muted">
                  {lang === 'ml'
                    ? 'ഈ സംഭാവന പൂർണ്ണമായും സ്വമേധയാ ഉള്ളതാണ്. താങ്കളുടെ സാന്നിധ്യവും പ്രാർത്ഥനകളുമാണ് ഞങ്ങൾക്ക് ഏറ്റവും പ്രധാനപ്പെട്ടത്.'
                    : 'Contributions are entirely voluntary. Your presence and heartfelt prayers remain our greatest gift.'}
                </p>
              </form>
            </div>
          </section>
        </>
      )}

      {/* SECTION I: WEDDING SPONSORS & PARTNERS */}
      {invitation.sponsors && invitation.sponsors.length > 0 && (
        <>
          {/* EDITORIAL DIVIDER */}
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-center space-x-4 py-4">
              <div className="h-[1px] bg-sand-border flex-1"></div>
              <span className="text-forest text-xs tracking-widest uppercase font-serif">✦ · ✦ · ✦</span>
              <div className="h-[1px] bg-sand-border flex-1"></div>
            </div>
          </div>

          <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-10">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-sand/40 border border-sand-border text-[11px] uppercase tracking-widest text-forest font-semibold">
                <Award className="w-3.5 h-3.5" />
                <span>{lang === 'ml' ? 'സഹകാരികൾ' : 'Wedding Partners'}</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-serif text-charcoal">
                {lang === 'ml' ? 'ഞങ്ങളുടെ വിവാഹ പങ്കാളികൾ' : 'Our Wedding Partners'}
              </h2>
              <p className="text-xs sm:text-sm text-charcoal-muted leading-relaxed max-w-xl mx-auto italic font-serif">
                "{lang === 'ml'
                  ? 'ഞങ്ങളുടെ ഈ മംഗളദിനം അവിസ്മരണീയമാക്കാൻ സഹായിച്ച എല്ലാ സഹകാരികൾക്കും സുഹൃത്തുക്കൾക്കും ഹൃദയം നിറഞ്ഞ നന്ദി.'
                  : 'We are grateful to the wonderful people and businesses who helped make our celebration special.'}"
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {invitation.sponsors.map((sponsor) => (
                <div
                  key={sponsor.id}
                  className="p-6 bg-ivory-surface border border-sand-border rounded-sm shadow-sm flex flex-col justify-between space-y-4 hover:border-forest/50 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-forest font-semibold px-2 py-0.5 bg-sand/40 border border-sand-border rounded">
                        {sponsor.category || sponsor.sponsorType || 'Partner'}
                      </span>

                      {t(sponsor.discountOfferEn, sponsor.discountOfferMl) && (
                        <span className="inline-flex items-center space-x-1 text-[10px] uppercase font-mono px-2 py-0.5 bg-forest text-ivory rounded font-semibold">
                          <Tag className="w-2.5 h-2.5" />
                          <span>Offer</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-3.5 pt-1">
                      {sponsor.logoUrl ? (
                        <div className="w-14 h-14 rounded border border-sand-border bg-ivory flex items-center justify-center p-1 overflow-hidden flex-shrink-0">
                          <img
                            src={sponsor.logoUrl}
                            alt={t(sponsor.nameEn, sponsor.nameMl)}
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded bg-sand/30 border border-sand-border flex items-center justify-center text-forest font-serif font-bold text-lg flex-shrink-0">
                          {t(sponsor.nameEn, sponsor.nameMl).charAt(0)}
                        </div>
                      )}

                      <div>
                        <h3 className="font-serif text-lg font-bold text-forest">
                          {t(sponsor.nameEn, sponsor.nameMl)}
                        </h3>
                        {sponsor.socialLinks && (
                          <span className="text-[11px] font-mono text-charcoal-muted block">
                            {sponsor.socialLinks}
                          </span>
                        )}
                      </div>
                    </div>

                    {t(sponsor.descriptionEn, sponsor.descriptionMl) && (
                      <p className="text-xs text-charcoal-muted leading-relaxed font-sans pt-1">
                        {t(sponsor.descriptionEn, sponsor.descriptionMl)}
                      </p>
                    )}

                    {t(sponsor.discountOfferEn, sponsor.discountOfferMl) && (
                      <div className="p-2.5 bg-sand/20 border border-sand-border/70 rounded text-[11px] text-forest font-medium">
                        ✦ {t(sponsor.discountOfferEn, sponsor.discountOfferMl)}
                      </div>
                    )}
                  </div>

                  {/* Links / Contact bar */}
                  <div className="pt-3 border-t border-sand-border/60 flex items-center justify-between text-xs text-charcoal-muted">
                    <div className="flex items-center space-x-3">
                      {sponsor.contactPhone && (
                        <a
                          href={`tel:${sponsor.contactPhone}`}
                          className="hover:text-forest inline-flex items-center space-x-1"
                          title="Call partner"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline text-[11px]">{sponsor.contactPhone}</span>
                        </a>
                      )}
                      {sponsor.contactEmail && (
                        <a
                          href={`mailto:${sponsor.contactEmail}`}
                          className="hover:text-forest inline-flex items-center space-x-1"
                          title="Email partner"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    {sponsor.websiteUrl && (
                      <a
                        href={sponsor.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-forest hover:underline font-mono text-[11px]"
                      >
                        <span>{lang === 'ml' ? 'വെബ്സൈറ്റ്' : 'Visit Site'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* FOOTER */}
      <footer className="border-t border-sand-border py-10 bg-ivory-surface text-center space-y-3 text-xs text-charcoal-muted">
        <p className="font-serif italic text-forest text-base">
          {lang === 'ml'
            ? 'ശുഭവിവാഹം · രണ്ട് മനസ്സുകളുടെ പവിത്ര സംഗമം'
            : 'Sacred Union · Crafted with Swiss Typographical Precision'}
        </p>
        <p className="text-[11px] font-mono">
          © {new Date().getFullYear()} {groomName} & {brideName}
        </p>
      </footer>

      {/* LIVE REAL-TIME YouPI PG UPI CHECKOUT MODAL */}
      {activeCheckoutSession && (
        <UpiCheckoutModal
          isOpen={Boolean(activeCheckoutSession)}
          onClose={() => setActiveCheckoutSession(null)}
          contributionId={activeCheckoutSession.contributionId}
          orderId={activeCheckoutSession.orderId}
          amount={activeCheckoutSession.amount}
          contributorName={activeCheckoutSession.contributorName}
          upiUri={activeCheckoutSession.upiUri}
          checkoutUrl={activeCheckoutSession.checkoutUrl}
          payeeVpa={activeCheckoutSession.payeeVpa}
          payeeName={activeCheckoutSession.payeeName}
          lang={lang}
          onPaymentReconciled={() => {
            // Optional: refresh public view
          }}
        />
      )}
    </div>
  );
};
