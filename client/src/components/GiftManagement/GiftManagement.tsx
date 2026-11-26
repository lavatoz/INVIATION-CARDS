import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { GiftSettings, GiftTotals, GiftContributionRecord, PaymentLifecycleStatus } from '../../types';
import { BilingualInput } from '../BilingualInput';
import {
  Gift,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  CreditCard,
  ShieldAlert,
  IndianRupee,
  History,
  Lock,
  FileCheck2,
  HelpCircle,
  Ban,
  Clock,
  Eye,
} from 'lucide-react';

interface GiftManagementProps {
  invitationId: string;
}

export const GiftManagement: React.FC<GiftManagementProps> = ({ invitationId }) => {
  const [settings, setSettings] = useState<GiftSettings>({
    enableGifts: false,
    giftHeadingEn: 'A Gift From the Heart',
    giftHeadingMl: 'ഹൃദയപൂർവ്വം ഒരു സമ്മാനം',
    giftIntroEn: 'Your presence is the greatest gift. If you wish to contribute towards our new journey together, we would be grateful for your blessings and support.',
    giftIntroMl: 'താങ്കളുടെ സാന്നിധ്യവും അനുഗ്രഹവുമാണ് ഞങ്ങൾക്ക് ഏറ്റവും വലിയ സമ്മാനം. ഞങ്ങളുടെ പുതിയ ജീവിതയാത്രയിലേക്ക് സ്നേഹപൂർവ്വം പങ്കുചേരാൻ ആഗ്രഹിക്കുന്നുവെങ്കിൽ ഈ സൗകര്യം ഉപയോഗിക്കാവുന്നതാണ്.',
    suggestedGiftAmounts: '200,500,2000',
    paymentConfig: {
      isConfigured: false,
      provider: 'youpi',
      keyId: '',
      upiId: '',
      merchantId: '',
      payeeName: '',
      notes: '',
    },
  });

  const [totals, setTotals] = useState<GiftTotals>({
    totalContributions: 0,
    verifiedContributions: 0,
    verifiedAmount: 0,
    reconciledContributions: 0,
    reconciledAmount: 0,
    observedContributions: 0,
    observedAmount: 0,
    pendingContributions: 0,
    pendingAmount: 0,
    manualReviewContributions: 0,
    manualReviewAmount: 0,
    failedOrExpiredCount: 0,
  });

  const [contributions, setContributions] = useState<GiftContributionRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'settings' | 'history'>('settings');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Manual Reconciliation Modal State
  const [selectedContribution, setSelectedContribution] = useState<GiftContributionRecord | null>(null);
  const [reconcileUtr, setReconcileUtr] = useState<string>('');
  const [reconcileNotes, setReconcileNotes] = useState<string>('');
  const [isReconciling, setIsReconciling] = useState<boolean>(false);

  const triggerFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [settingsRes, contribRes] = await Promise.all([
        api.getGiftSettings(invitationId),
        api.getGiftContributions(invitationId),
      ]);

      if (settingsRes.success && settingsRes.data) {
        setSettings({
          ...settingsRes.data.settings,
          giftHeadingEn: settingsRes.data.settings.giftHeadingEn || 'A Gift From the Heart',
          giftHeadingMl: settingsRes.data.settings.giftHeadingMl || 'ഹൃദയപൂർവ്വം ഒരു സമ്മാനം',
          paymentConfig: settingsRes.data.settings.paymentConfig || {
            isConfigured: false,
            provider: 'youpi',
            keyId: '',
            upiId: '',
            payeeName: '',
          },
        });
        setTotals(settingsRes.data.totals);
      }

      if (contribRes.success && contribRes.data) {
        setContributions(contribRes.data.contributions);
      }
    } catch (err: any) {
      triggerFeedback('error', err.message || 'Failed to load gift settings.');
    } finally {
      setIsLoading(false);
    }
  }, [invitationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const res = await api.updateGiftSettings(invitationId, {
        enableGifts: settings.enableGifts,
        giftHeadingEn: settings.giftHeadingEn,
        giftHeadingMl: settings.giftHeadingMl,
        giftIntroEn: settings.giftIntroEn,
        giftIntroMl: settings.giftIntroMl,
        suggestedGiftAmounts: settings.suggestedGiftAmounts,
        paymentConfig: settings.paymentConfig,
      });

      if (res.success) {
        triggerFeedback('success', 'Gift settings and payment rules updated successfully.');
        loadData();
      }
    } catch (err: any) {
      triggerFeedback('error', err.message || 'Failed to update gift settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const openReconcileModal = (contrib: GiftContributionRecord) => {
    setSelectedContribution(contrib);
    setReconcileUtr(contrib.paymentTransaction?.utr || '');
    setReconcileNotes(contrib.paymentTransaction?.verificationNotes || 'Matched against bank statement.');
  };

  const handleConfirmReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContribution) return;

    if (!reconcileUtr.trim()) {
      triggerFeedback('error', 'Bank UTR or reference number is required for reconciliation.');
      return;
    }

    setIsReconciling(true);
    try {
      const res = await api.reconcileGiftContribution(invitationId, selectedContribution.id, {
        utr: reconcileUtr.trim(),
        verificationNotes: reconcileNotes.trim(),
      });

      if (res.success) {
        triggerFeedback('success', `Payment reconciled successfully (Ref: ${reconcileUtr.trim()})`);
        setSelectedContribution(null);
        loadData();
      }
    } catch (err: any) {
      triggerFeedback('error', err.message || 'Failed to reconcile payment.');
    } finally {
      setIsReconciling(false);
    }
  };

  const handleFlagReview = async (contrib: GiftContributionRecord, status: 'MANUAL_REVIEW' | 'FAILED') => {
    const reason = window.prompt(`Enter note for marking this contribution as ${status}:`, status === 'FAILED' ? 'Bank credit not found.' : 'Discrepancy in UTR.');
    if (reason === null) return;

    try {
      const res = await api.flagContributionReview(invitationId, contrib.id, {
        status,
        notes: reason,
      });

      if (res.success) {
        triggerFeedback('success', `Transaction marked as ${status}.`);
        loadData();
      }
    } catch (err: any) {
      triggerFeedback('error', err.message || 'Failed to update transaction status.');
    }
  };

  const statusBadge = (status?: PaymentLifecycleStatus) => {
    switch (status) {
      case 'RECONCILED':
      case 'SUCCESS':
        return (
          <span className="px-2 py-0.5 text-[10px] uppercase font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 rounded flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
            <span>Reconciled</span>
          </span>
        );
      case 'OBSERVED_SUCCESS':
        return (
          <span className="px-2 py-0.5 text-[10px] uppercase font-mono font-bold bg-sky-100 text-sky-900 border border-sky-300 rounded flex items-center space-x-1">
            <Eye className="w-3 h-3 text-sky-700" />
            <span>Observed (Unreconciled)</span>
          </span>
        );
      case 'MANUAL_REVIEW':
        return (
          <span className="px-2 py-0.5 text-[10px] uppercase font-mono font-bold bg-purple-100 text-purple-900 border border-purple-300 rounded flex items-center space-x-1">
            <HelpCircle className="w-3 h-3 text-purple-700" />
            <span>Manual Review</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="px-2 py-0.5 text-[10px] uppercase font-mono font-bold bg-rose-100 text-rose-900 border border-rose-300 rounded flex items-center space-x-1">
            <Ban className="w-3 h-3 text-rose-700" />
            <span>Failed</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2 py-0.5 text-[10px] uppercase font-mono font-bold bg-rose-50 text-rose-800 border border-rose-200 rounded flex items-center space-x-1">
            <Ban className="w-3 h-3 text-rose-600" />
            <span>Cancelled</span>
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="px-2 py-0.5 text-[10px] uppercase font-mono font-bold bg-gray-100 text-gray-700 border border-gray-300 rounded flex items-center space-x-1">
            <Clock className="w-3 h-3 text-gray-500" />
            <span>Expired</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] uppercase font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 rounded flex items-center space-x-1">
            <Clock className="w-3 h-3 text-amber-600 animate-spin" />
            <span>Pending</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-sand-border/70 pb-3 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-serif text-forest flex items-center space-x-2">
            <Gift className="w-5 h-5" />
            <span>Gift Contributions & UPI Reconciliation</span>
          </h2>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Real-time YouPI PG V2 UPI integration, bank statement reconciliation, and strict accounting safeguards.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="p-2 bg-sand/30 hover:bg-sand/60 border border-sand-border text-charcoal rounded-sm transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="px-4 py-2 bg-forest text-ivory text-xs uppercase tracking-widest font-semibold rounded-sm hover:bg-forest-light flex items-center space-x-1"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>

      {/* Feedback Message */}
      {feedback && (
        <div
          className={`p-3 rounded-sm text-xs flex items-center space-x-2 transition-all ${
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

      {/* 5 Distinct Accounting Totals Banners */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* 1. Reconciled Received */}
        <div className="p-3 bg-ivory border-2 border-forest rounded-sm text-center shadow-xs">
          <p className="text-xl font-serif font-bold text-forest">₹{(totals.reconciledAmount ?? totals.verifiedAmount).toLocaleString('en-IN')}</p>
          <p className="text-[10px] uppercase tracking-widest text-forest font-bold mt-0.5">
            Reconciled Received ({totals.reconciledContributions ?? totals.verifiedContributions})
          </p>
          <span className="text-[9px] text-charcoal-muted block mt-0.5">Matched with bank statement</span>
        </div>

        {/* 2. Observed Alert (Unreconciled) */}
        <div className="p-3 bg-sky-50/50 border border-sky-300 rounded-sm text-center">
          <p className="text-xl font-serif font-bold text-sky-800">₹{(totals.observedAmount ?? 0).toLocaleString('en-IN')}</p>
          <p className="text-[10px] uppercase tracking-widest text-sky-900 font-semibold mt-0.5">
            Observed Alert ({totals.observedContributions ?? 0})
          </p>
          <span className="text-[9px] text-sky-700 block mt-0.5">Bank SMS captured, pending statement</span>
        </div>

        {/* 3. Pending Verification */}
        <div className="p-3 bg-amber-50/50 border border-amber-300 rounded-sm text-center">
          <p className="text-xl font-serif font-bold text-amber-800">₹{totals.pendingAmount.toLocaleString('en-IN')}</p>
          <p className="text-[10px] uppercase tracking-widest text-amber-900 font-semibold mt-0.5">
            Pending ({totals.pendingContributions ?? 0})
          </p>
          <span className="text-[9px] text-amber-700 block mt-0.5">Active or awaiting payment</span>
        </div>

        {/* 4. Needs Manual Review */}
        <div className="p-3 bg-purple-50/50 border border-purple-300 rounded-sm text-center">
          <p className="text-xl font-serif font-bold text-purple-800">₹{(totals.manualReviewAmount ?? 0).toLocaleString('en-IN')}</p>
          <p className="text-[10px] uppercase tracking-widest text-purple-900 font-semibold mt-0.5">
            Review Needed ({totals.manualReviewContributions ?? 0})
          </p>
          <span className="text-[9px] text-purple-700 block mt-0.5">Flagged or amount discrepancy</span>
        </div>

        {/* 5. Failed / Expired */}
        <div className="p-3 bg-gray-50 border border-gray-300 rounded-sm text-center">
          <p className="text-xl font-serif font-bold text-gray-700">{totals.failedOrExpiredCount ?? 0}</p>
          <p className="text-[10px] uppercase tracking-widest text-gray-700 font-semibold mt-0.5">
            Failed / Expired
          </p>
          <span className="text-[9px] text-gray-500 block mt-0.5">Timed out or cancelled</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-sand-border space-x-4">
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`pb-2.5 text-xs uppercase tracking-wider font-semibold transition-all flex items-center space-x-1.5 ${
            activeTab === 'settings'
              ? 'border-b-2 border-forest text-forest'
              : 'text-charcoal-muted hover:text-charcoal'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Gateway & Safeguards</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`pb-2.5 text-xs uppercase tracking-wider font-semibold transition-all flex items-center space-x-1.5 ${
            activeTab === 'history'
              ? 'border-b-2 border-forest text-forest'
              : 'text-charcoal-muted hover:text-charcoal'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Contributions & Bank Reconciliation ({contributions.length})</span>
        </button>
      </div>

      {/* TAB 1: SETTINGS */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Enable / Disable Gift Feature Toggle */}
          <div className="p-4 bg-sand/20 border border-sand-border rounded-sm flex items-center justify-between">
            <div>
              <span className="block text-xs uppercase tracking-wider text-charcoal font-semibold">
                Enable Gift Contributions Section
              </span>
              <p className="text-[11px] text-charcoal-muted mt-0.5">
                Displays the "A Gift From the Heart" section on the public wedding invitation page.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableGifts}
                onChange={(e) => setSettings((prev) => ({ ...prev, enableGifts: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-sand-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-ivory after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-ivory after:border-sand after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forest"></div>
            </label>
          </div>

          {/* Section Headings */}
          <BilingualInput
            label="Gift Section Heading"
            englishValue={settings.giftHeadingEn || ''}
            malayalamValue={settings.giftHeadingMl || ''}
            onEnglishChange={(v) => setSettings((prev) => ({ ...prev, giftHeadingEn: v }))}
            onMalayalamChange={(v) => setSettings((prev) => ({ ...prev, giftHeadingMl: v }))}
            englishPlaceholder="A Gift From the Heart"
            malayalamPlaceholder="ഹൃദയപൂർവ്വം ഒരു സമ്മാനം"
            required
          />

          {/* Section Introductions */}
          <BilingualInput
            label="Section Introduction & Blessings Note"
            englishValue={settings.giftIntroEn || ''}
            malayalamValue={settings.giftIntroMl || ''}
            onEnglishChange={(v) => setSettings((prev) => ({ ...prev, giftIntroEn: v }))}
            onMalayalamChange={(v) => setSettings((prev) => ({ ...prev, giftIntroMl: v }))}
            englishPlaceholder="Your presence is the greatest gift. If you wish to contribute towards our new journey together, we would be grateful for your blessings and support."
            malayalamPlaceholder="താങ്കളുടെ സാന്നിധ്യവും അനുഗ്രഹവുമാണ് ഞങ്ങൾക്ക് ഏറ്റവും വലിയ സമ്മാനം. ഞങ്ങളുടെ പുതിയ ജീവിതയാത്രയിലേക്ക് സ്നേഹപൂർവ്വം പങ്കുചേരാൻ ആഗ്രഹിക്കുന്നുവെങ്കിൽ ഈ സൗകര്യം ഉപയോഗിക്കാവുന്നതാണ്."
            isTextarea
            rows={3}
          />

          {/* Suggested Amounts */}
          <div className="space-y-1.5">
            <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold">
              Suggested Contribution Amounts (₹ in INR)
            </label>
            <div className="flex items-center space-x-2">
              <IndianRupee className="w-4 h-4 text-charcoal-muted" />
              <input
                type="text"
                value={settings.suggestedGiftAmounts || ''}
                onChange={(e) => setSettings((prev) => ({ ...prev, suggestedGiftAmounts: e.target.value }))}
                placeholder="200,500,2000"
                className="w-full px-3 py-2 bg-ivory border border-sand-border rounded-sm text-xs font-mono text-charcoal"
              />
            </div>
            <p className="text-[11px] text-charcoal-muted">
              Enter comma-separated amounts. Default values are ₹200, ₹500, and ₹2,000.
            </p>
          </div>

          {/* Payment Gateway Configuration & YouPI Safeguards Card */}
          <div className="p-6 bg-ivory border border-sand-border rounded-sm space-y-4">
            <div className="flex items-center justify-between border-b border-sand-border pb-3">
              <div className="flex items-center space-x-2 text-forest">
                <Lock className="w-4 h-4" />
                <h3 className="font-serif font-bold text-sm">Payment Gateway & Financial Security</h3>
              </div>
              <span className="text-[10px] font-mono uppercase bg-sand/40 text-charcoal px-2 py-0.5 rounded">
                Controlled Testing Mode
              </span>
            </div>

            {/* Strict Regulatory & Safety Notices */}
            <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-sm text-xs text-amber-950 space-y-1.5">
              <div className="flex items-center space-x-1.5 font-bold text-amber-900">
                <ShieldAlert className="w-4 h-4 text-amber-800" />
                <span>Real Payment Safeguards & Invariants</span>
              </div>
              <ul className="list-disc list-inside text-[11px] text-amber-900 space-y-1">
                <li><strong>No Auto-Reconciliation:</strong> Bank SMS notifications (`OBSERVED_SUCCESS`) indicate an alert on a device, not guaranteed settlement. They are never counted in confirmed totals until matched against the bank statement.</li>
                <li><strong>20 Payments/Day Limit:</strong> Enforces YouPI PG's conservative experimental limit to avoid bank account velocity flags.</li>
                <li><strong>Account Holder Consent:</strong> Required by server configuration. Never store banking passwords or UPI PINs.</li>
              </ul>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.paymentConfig?.isConfigured ?? false}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        paymentConfig: {
                          ...prev.paymentConfig,
                          isConfigured: e.target.checked,
                        },
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-sand-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-ivory after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-ivory after:border-sand after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-forest"></div>
                </label>
                <span className="text-xs uppercase tracking-wider font-semibold text-charcoal">
                  Enable Live Payment Processing
                </span>
              </div>

              {settings.paymentConfig?.isConfigured && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1">
                      Gateway Provider
                    </label>
                    <select
                      value={settings.paymentConfig?.provider || 'youpi'}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          paymentConfig: {
                            ...prev.paymentConfig,
                            provider: e.target.value,
                          },
                        }))
                      }
                      className="w-full px-3 py-2 bg-ivory border border-sand-border rounded-sm text-xs text-charcoal"
                    >
                      <option value="youpi">YouPI PG V2 (Zero-Fee UPI Observer)</option>
                      <option value="direct_upi">Direct UPI Intent QR</option>
                      <option value="razorpay">Razorpay (Regulated Aggregator)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1">
                      Receiving UPI VPA (ID) *
                    </label>
                    <input
                      type="text"
                      value={settings.paymentConfig?.upiId || ''}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          paymentConfig: {
                            ...prev.paymentConfig,
                            upiId: e.target.value.trim(),
                            keyId: e.target.value.trim(),
                          },
                        }))
                      }
                      placeholder="e.g. brideandgroom@okhdfcbank"
                      className="w-full px-3 py-2 bg-ivory border border-sand-border rounded-sm text-xs font-mono text-charcoal"
                    />
                    <p className="text-[10px] text-charcoal-muted mt-1">
                      Crucial: Must be a valid VPA (e.g. name@okhdfcbank). Required for QR payments in Google Pay, PhonePe, Paytm, and BHIM.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1">
                      Payee Display Name
                    </label>
                    <input
                      type="text"
                      value={settings.paymentConfig?.payeeName || ''}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          paymentConfig: {
                            ...prev.paymentConfig,
                            payeeName: e.target.value,
                          },
                        }))
                      }
                      placeholder="e.g. Rahul & Deepa"
                      className="w-full px-3 py-2 bg-ivory border border-sand-border rounded-sm text-xs text-charcoal"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: CONTRIBUTION HISTORY & BANK RECONCILIATION */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {contributions.length === 0 ? (
            <div className="p-8 bg-ivory border border-sand-border rounded-sm text-center space-y-2">
              <Gift className="w-8 h-8 text-charcoal-muted mx-auto" />
              <p className="text-xs text-charcoal-muted italic">
                No gift contributions have been submitted yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {contributions.map((c) => {
                const tx = c.paymentTransaction;
                const isReconciled = tx?.status === 'RECONCILED' || tx?.status === 'SUCCESS';
                const isObserved = tx?.status === 'OBSERVED_SUCCESS';
                const isReview = tx?.status === 'MANUAL_REVIEW';

                return (
                  <div
                    key={c.id}
                    className={`p-4 bg-ivory border rounded-sm space-y-3 transition-colors ${
                      isReconciled
                        ? 'border-emerald-300 bg-emerald-50/20'
                        : isObserved
                        ? 'border-sky-300 bg-sky-50/20'
                        : isReview
                        ? 'border-purple-300 bg-purple-50/20'
                        : 'border-sand-border'
                    }`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-charcoal font-serif">{c.contributorName}</span>
                        {statusBadge(tx?.status)}
                      </div>
                      <span className="font-serif font-bold text-base text-forest">
                        ₹{Number(c.amount).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-charcoal-muted">
                      <div>
                        <span className="font-semibold text-charcoal">Order ID:</span>{' '}
                        <span className="font-mono text-charcoal">{tx?.orderId || '—'}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-charcoal">Bank UTR:</span>{' '}
                        <span className="font-mono font-bold text-charcoal">{tx?.utr || 'Pending'}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-charcoal">Submitted:</span> {new Date(c.createdAt).toLocaleString()}
                      </div>
                      <div>
                        <span className="font-semibold text-charcoal">Settlement:</span>{' '}
                        <span className="font-mono">{tx?.settlementState || 'NOT_RECONCILED'}</span>
                      </div>
                    </div>

                    {tx?.reconciledBy && (
                      <div className="text-[11px] text-emerald-900 bg-emerald-100/60 p-2 rounded-sm border border-emerald-200">
                        <span className="font-semibold">Reconciled By:</span> {tx.reconciledBy} on {new Date(tx.reconciledAt || '').toLocaleString()}
                        {tx.verificationNotes && <span className="block mt-0.5 italic">Note: {tx.verificationNotes}</span>}
                      </div>
                    )}

                    {tx?.verificationNotes && !tx?.reconciledBy && (
                      <div className="text-[11px] text-purple-900 bg-purple-100/60 p-2 rounded-sm border border-purple-200">
                        <span className="font-semibold">Review Notice:</span> {tx.verificationNotes}
                      </div>
                    )}

                    {c.wishes && (
                      <div className="p-2 bg-sand/20 border border-sand-border/60 rounded-sm text-xs text-charcoal italic">
                        "{c.wishes}"
                      </div>
                    )}

                    {/* Operational Actions */}
                    <div className="flex items-center justify-end space-x-2 pt-1 border-t border-sand-border/50">
                      {!isReconciled && (
                        <>
                          <button
                            type="button"
                            onClick={() => openReconcileModal(c)}
                            className="px-3 py-1.5 bg-forest text-ivory text-xs font-semibold rounded-sm hover:bg-forest-light flex items-center space-x-1.5"
                          >
                            <FileCheck2 className="w-3.5 h-3.5" />
                            <span>Reconcile with Statement</span>
                          </button>

                          {!isReview && (
                            <button
                              type="button"
                              onClick={() => handleFlagReview(c, 'MANUAL_REVIEW')}
                              className="px-2.5 py-1.5 bg-sand/30 border border-sand-border text-charcoal text-xs rounded-sm hover:bg-sand/60"
                            >
                              Flag for Review
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleFlagReview(c, 'FAILED')}
                            className="px-2.5 py-1.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-sm hover:bg-rose-100"
                          >
                            Reject False Claim
                          </button>
                        </>
                      )}

                      {isReconciled && (
                        <span className="text-[11px] text-emerald-800 font-semibold flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Officially Reconciled</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: Bank Statement Reconciliation Workflow */}
      {selectedContribution && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 backdrop-blur-xs p-4">
          <div className="bg-ivory border border-sand-border rounded-sm max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-sand-border pb-3">
              <div className="flex items-center space-x-2 text-forest">
                <FileCheck2 className="w-5 h-5" />
                <h3 className="font-serif font-bold text-base">Reconcile with Bank Statement</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedContribution(null)}
                className="text-charcoal-muted hover:text-charcoal text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-sand/20 border border-sand-border rounded-sm text-xs space-y-1">
              <div><span className="font-bold text-charcoal">Contributor:</span> {selectedContribution.contributorName}</div>
              <div><span className="font-bold text-charcoal">Expected Amount:</span> ₹{Number(selectedContribution.amount).toLocaleString('en-IN')}</div>
              <div><span className="font-bold text-charcoal">Order ID:</span> <span className="font-mono">{selectedContribution.paymentTransaction?.orderId}</span></div>
            </div>

            <form onSubmit={handleConfirmReconciliation} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1">
                  Bank UTR Reference (12 Digits) *
                </label>
                <input
                  type="text"
                  required
                  value={reconcileUtr}
                  onChange={(e) => setReconcileUtr(e.target.value)}
                  placeholder="e.g. 412356789012"
                  className="w-full px-3 py-2 bg-ivory border border-sand-border rounded-sm text-xs font-mono text-charcoal"
                />
                <p className="text-[10px] text-charcoal-muted mt-1">
                  Verify this reference from your official netbanking portal or downloaded CSV statement.
                </p>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1">
                  Reconciliation Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={reconcileNotes}
                  onChange={(e) => setReconcileNotes(e.target.value)}
                  placeholder="Verified against HDFC statement dated 21-Nov-2026."
                  className="w-full px-3 py-2 bg-ivory border border-sand-border rounded-sm text-xs text-charcoal"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-sand-border">
                <button
                  type="button"
                  onClick={() => setSelectedContribution(null)}
                  className="px-3 py-2 border border-sand-border text-xs text-charcoal rounded-sm hover:bg-sand/30"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReconciling}
                  className="px-4 py-2 bg-forest text-ivory text-xs uppercase tracking-widest font-semibold rounded-sm hover:bg-forest-light flex items-center space-x-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isReconciling ? 'Confirming...' : 'Confirm Reconciliation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
