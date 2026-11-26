import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Clock,
  ExternalLink,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Eye,
  X,
  Copy,
  ChevronRight,
  Send,
} from 'lucide-react';
import { api, API_BASE } from '../../services/api';
import { PaymentLifecycleStatus } from '../../types';

interface UpiCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  contributionId: string;
  orderId: string;
  transactionReference?: string;
  gateway?: string;
  amount: number;
  contributorName: string;
  upiUri?: string | null;
  checkoutUrl?: string | null;
  payeeVpa?: string | null;
  payeeName?: string | null;
  lang: 'en' | 'ml';
  onPaymentReconciled?: (details?: {
    contributionId: string;
    orderId: string;
    transactionReference?: string;
    utr?: string | null;
    amount: number;
    status: PaymentLifecycleStatus;
  }) => void;
}

export const UpiCheckoutModal: React.FC<UpiCheckoutModalProps> = ({
  isOpen,
  onClose,
  contributionId,
  orderId,
  transactionReference,
  gateway,
  amount,
  contributorName,
  upiUri,
  checkoutUrl,
  payeeVpa,
  payeeName,
  lang,
  onPaymentReconciled,
}) => {
  const [status, setStatus] = useState<PaymentLifecycleStatus>('PENDING');
  const [settlementState, setSettlementState] = useState<string>('NOT_RECONCILED');
  const [utr, setUtr] = useState<string | null>(null);
  const [txRef, setTxRef] = useState<string | undefined>(transactionReference);
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 minutes standard YouPI queue slot
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isVpaCopied, setIsVpaCopied] = useState<boolean>(false);
  const [isLaunchingApp, setIsLaunchingApp] = useState<boolean>(false);
  const [appLaunchFeedback, setAppLaunchFeedback] = useState<string | null>(null);

  // Guest UTR self-reporting
  const [showUtrInput, setShowUtrInput] = useState<boolean>(false);
  const [guestUtr, setGuestUtr] = useState<string>('');
  const [isSubmittingUtr, setIsSubmittingUtr] = useState<boolean>(false);
  const [utrFeedback, setUtrFeedback] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notifiedVerifiedRef = useRef<boolean>(false);

  const isPaidStatus = (s: string) => s === 'RECONCILED' || s === 'SUCCESS';
  const isTerminalStatus = (s: string) =>
    s === 'RECONCILED' ||
    s === 'SUCCESS' ||
    s === 'FAILED' ||
    s === 'CANCELLED' ||
    s === 'EXPIRED';

  // Countdown Timer
  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setStatus((current) => (current === 'PENDING' ? 'EXPIRED' : current));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  // Real-Time SSE Listener + Polling Fallback
  useEffect(() => {
    if (!isOpen || !contributionId) return;

    const applyStatusUpdate = (data: {
      status?: string;
      settlementState?: string;
      utr?: string | null;
      transactionReference?: string;
    }) => {
      if (data.status) {
        setStatus(data.status as PaymentLifecycleStatus);
      }
      if (data.settlementState) {
        setSettlementState(data.settlementState);
      }
      if (data.utr) {
        setUtr(data.utr);
      }
      if (data.transactionReference) {
        setTxRef(data.transactionReference);
      }
      if (data.status && isPaidStatus(data.status) && !notifiedVerifiedRef.current) {
        notifiedVerifiedRef.current = true;
        if (onPaymentReconciled) {
          onPaymentReconciled({
            contributionId,
            orderId,
            transactionReference: data.transactionReference || txRef,
            utr: data.utr || utr,
            amount,
            status: data.status as PaymentLifecycleStatus,
          });
        }
      }
      if (data.status && isTerminalStatus(data.status)) {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      }
    };

    // 1. Establish SSE Connection
    const sseUrl = `${API_BASE}/public/contributions/${contributionId}/status-stream`;
    try {
      const es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      es.addEventListener('payment_status', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          applyStatusUpdate(data);
        } catch (err) {
          console.error('Error parsing SSE payment status:', err);
        }
      });

      es.onerror = () => {
        // Fall back gracefully to polling
        es.close();
      };
    } catch (err) {
      console.warn('SSE not supported or failed to connect, relying on poller:', err);
    }

    // 2. Periodic Polling Fallback (every 4 seconds)
    const pollStatus = async () => {
      try {
        const res = await api.getContributionStatus(contributionId);
        if (res.success && res.data) {
          applyStatusUpdate(res.data);
        }
      } catch {
        // Polling retry
      }
    };

    pollIntervalRef.current = setInterval(pollStatus, 4000);

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [isOpen, contributionId, onPaymentReconciled]);

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  const copyUpiLink = () => {
    if (upiUri) {
      navigator.clipboard.writeText(upiUri);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const copyVpa = () => {
    if (payeeVpa) {
      navigator.clipboard.writeText(payeeVpa);
      setIsVpaCopied(true);
      setTimeout(() => setIsVpaCopied(false), 2000);
    }
  };

  const isMobileDevice = () => {
    if (typeof window === 'undefined') return false;
    return (
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '') ||
      (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent || ''))
    );
  };

  const handleOpenUpiApp = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!upiUri) return;

    if (!isMobileDevice()) {
      setAppLaunchFeedback(
        lang === 'ml'
          ? 'ഡെസ്ക്ടോപ്പിൽ UPI ആപ്പുകൾ നേരിട്ട് തുറക്കാൻ കഴിയില്ല. ദയവായി മുകളിലെ QR കോഡ് നിങ്ങളുടെ മൊബൈൽ ഫോണിലെ ഏതെങ്കിലും UPI ആപ്പ് (Google Pay, PhonePe, Paytm, BHIM) ഉപയോഗിച്ച് സ്കാൻ ചെയ്യുക.'
          : 'UPI apps can only be opened directly on a mobile device. Please scan the QR code above using your mobile UPI app (Google Pay, PhonePe, Paytm, BHIM) or copy the UPI ID below.'
      );
      return;
    }

    setIsLaunchingApp(true);
    setAppLaunchFeedback(null);

    // Direct programmatic navigation with the validated UPI URI (avoids popup-blocker restrictions)
    try {
      window.location.href = upiUri;
    } catch (err) {
      console.error('Failed to trigger UPI URI navigation:', err);
    }

    // Timer fallback in case no handler app opens or device returns without launch
    setTimeout(() => {
      setIsLaunchingApp(false);
      setAppLaunchFeedback(
        lang === 'ml'
          ? 'ആപ്പ് തുറക്കാൻ സാധിച്ചില്ലേ? ദയവായി മുകളിലെ QR കോഡ് സ്കാൻ ചെയ്യുകയോ താഴെയുള്ള UPI ID കോപ്പി ചെയ്യുകയോ ചെയ്യുക.'
          : 'Unable to open UPI app? Please scan the QR code using Google Pay, PhonePe, Paytm or BHIM, or copy the UPI ID below.'
      );
    }, 2500);
  };

  const handleGuestUtrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestUtr.trim() || guestUtr.trim().length < 6) {
      setUtrFeedback(lang === 'ml' ? 'സാധുവായ 12 അക്ക UTR റഫറൻസ് നൽകുക.' : 'Enter a valid bank UTR reference.');
      return;
    }

    setIsSubmittingUtr(true);
    setUtrFeedback(null);
    try {
      const res = await api.submitGuestUtr(contributionId, guestUtr.trim());
      if (res.success) {
        setUtr(guestUtr.trim());
        setStatus('OBSERVED_SUCCESS');
        setShowUtrInput(false);
        setUtrFeedback(lang === 'ml' ? 'റഫറൻസ് രേഖപ്പെടുത്തി. ബാങ്ക് സ്റ്റേറ്റ്മെന്റുമായി ഒത്തുനോക്കുന്നതാണ്.' : 'Reference submitted! Will be reconciled with host bank statement.');
      }
    } catch (err: any) {
      setUtrFeedback(err.message || 'Failed to submit reference');
    } finally {
      setIsSubmittingUtr(false);
    }
  };

  const isTerminal = isTerminalStatus(status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/70 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-ivory border border-sand-border rounded-sm max-w-md w-full p-6 shadow-2xl relative space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-charcoal-muted hover:text-charcoal p-1 transition-colors"
          title="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-1 border-b border-sand-border/70 pb-3">
          <span className="text-[10px] uppercase font-mono tracking-widest text-forest font-semibold block">
            {lang === 'ml' ? 'യു.പി.ഐ ഡിജിറ്റൽ സംഭാവന' : 'UPI Gift Contribution'}
          </span>
          <h2 className="text-2xl font-serif font-bold text-forest">
            ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </h2>
          <p className="text-xs text-charcoal-muted">
            {lang === 'ml' ? 'ആശംസകൾ അർപ്പിക്കുന്നത്: ' : 'From: '}
            <strong className="text-charcoal">{contributorName}</strong>
          </p>
          <div className="text-[10px] font-mono text-charcoal-muted pt-0.5 flex items-center justify-center space-x-2">
            <span>Order: {orderId}</span>
            <span>·</span>
            <span>State: {settlementState}</span>
          </div>
        </div>

        {/* LIVE STATUS BANNER */}
        <div className="rounded-sm p-3 border transition-all">
          {(status === 'PENDING' || status === 'CREATED' || status === 'INITIATED') && (
            <div className="bg-amber-50/70 border border-amber-200 text-amber-900 flex items-center space-x-3 p-1">
              <Clock className="w-5 h-5 text-amber-600 animate-spin flex-shrink-0" />
              <div className="text-xs">
                <span className="font-semibold block">
                  {lang === 'ml' ? 'പേയ്‌മെന്റിനായി കാത്തിരിക്കുന്നു...' : 'Waiting for payment'}
                </span>
                <span className="text-[11px] text-amber-800">
                  {gateway === 'YOUPI_PG_V2'
                    ? lang === 'ml'
                      ? 'QR കോഡ് സ്കാൻ ചെയ്യുകയോ UPI ആപ്പ് തുറക്കുകയോ ചെയ്യുക. പേയ്‌മെന്റ് സ്ഥിരീകരിക്കുമ്പോൾ സ്വയം അപ്‌ഡേറ്റ് ആകും.'
                      : 'Scan with any UPI app or tap below. Status will update automatically once verified by gateway.'
                    : lang === 'ml'
                    ? 'QR കോഡ് സ്കാൻ ചെയ്ത് പണമടച്ച ശേഷം താഴെ 12 അക്ക UTR നമ്പർ നൽകുക.'
                    : 'Scan with any UPI app, then submit your 12-digit Bank UTR below for host verification.'}
                </span>
              </div>
            </div>
          )}

          {status === 'OBSERVED_SUCCESS' && (
            <div className="bg-sky-50 border border-sky-300 text-sky-950 flex items-center space-x-3 p-1">
              <Eye className="w-5 h-5 text-sky-700 animate-pulse flex-shrink-0" />
              <div className="text-xs">
                <span className="font-bold block text-sky-900">
                  {lang === 'ml'
                    ? 'പേയ്‌മെന്റ് സ്ഥിരീകരണം കാത്തിരിക്കുന്നു'
                    : 'Payment Pending Verification'}
                </span>
                <span className="text-[11px] text-sky-800">
                  {utr ? `Ref UTR: ${utr} · ` : ''}
                  {lang === 'ml'
                    ? 'താങ്കളുടെ റഫറൻസ് രേഖപ്പെടുത്തി. ആതിഥേയർ ബാങ്ക് രേഖകൾ പരിശോധിച്ച് സ്ഥിരീകരിക്കുന്നതാണ്.'
                    : 'Reference recorded. Awaiting host or bank statement verification before marking as paid.'}
                </span>
              </div>
            </div>
          )}

          {(status === 'RECONCILED' || status === 'SUCCESS') && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center space-x-3 p-1">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 flex-shrink-0" />
              <div className="text-xs space-y-0.5">
                <span className="font-bold block text-emerald-900">
                  {lang === 'ml' ? 'പേയ്‌മെന്റ് വിജയകരമായി പൂർത്തിയായി' : 'Payment Successful'}
                </span>
                <span className="text-[11px] text-emerald-800 block">
                  ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ·{' '}
                  {utr ? `UTR: ${utr}` : txRef ? `Ref: ${txRef}` : `Order: ${orderId}`}
                </span>
                <span className="text-[11px] text-emerald-800 block">
                  {lang === 'ml'
                    ? 'താങ്കളുടെ സ്നേഹപൂർവ്വമായ സംഭാവനയ്ക്കും അനുഗ്രഹങ്ങൾക്കും നന്ദി!'
                    : 'Your contribution has been verified and confirmed for the couple!'}
                </span>
              </div>
            </div>
          )}

          {status === 'MANUAL_REVIEW' && (
            <div className="bg-purple-50 border border-purple-300 text-purple-950 flex items-center space-x-3 p-1">
              <HelpCircle className="w-5 h-5 text-purple-700 flex-shrink-0" />
              <div className="text-xs">
                <span className="font-bold block text-purple-900">
                  {lang === 'ml' ? 'പേയ്‌മെന്റ് സ്ഥിരീകരണം കാത്തിരിക്കുന്നു' : 'Payment Pending Verification'}
                </span>
                <span className="text-[11px] text-purple-800">
                  {lang === 'ml'
                    ? 'തുക അല്ലെങ്കിൽ റഫറൻസിൽ വ്യത്യാസം കണ്ടതിനാൽ ആതിഥേയർ നേരിട്ട് പരിശോധിക്കുന്നതാണ്.'
                    : 'The transaction requires manual review by the wedding hosts.'}
                </span>
              </div>
            </div>
          )}

          {status === 'FAILED' && (
            <div className="bg-rose-50 border border-rose-300 text-rose-950 flex items-center space-x-3 p-1">
              <AlertCircle className="w-5 h-5 text-rose-700 flex-shrink-0" />
              <div className="text-xs">
                <span className="font-bold block text-rose-900">
                  {lang === 'ml' ? 'പേയ്‌മെന്റ് പരാജയപ്പെട്ടു' : 'Payment Failed'}
                </span>
                <span className="text-[11px] text-rose-800">
                  {lang === 'ml'
                    ? 'ഇടപാട് പൂർത്തിയാക്കാൻ സാധിച്ചില്ല. ദയവായി വീണ്ടും ശ്രമിക്കുക.'
                    : 'The transaction could not be completed. Please retry.'}
                </span>
              </div>
            </div>
          )}

          {status === 'CANCELLED' && (
            <div className="bg-rose-50/70 border border-rose-200 text-rose-950 flex items-center space-x-3 p-1">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              <div className="text-xs">
                <span className="font-bold block text-rose-900">
                  {lang === 'ml' ? 'പേയ്‌മെന്റ് റദ്ദാക്കി' : 'Payment Cancelled'}
                </span>
                <span className="text-[11px] text-rose-800">
                  {lang === 'ml'
                    ? 'ഈ പേയ്‌മെന്റ് ഇടപാട് റദ്ദാക്കപ്പെട്ടു. ആവശ്യമെങ്കിൽ വീണ്ടും ആരംഭിക്കാം.'
                    : 'This payment was cancelled. You may close and initiate a new contribution.'}
                </span>
              </div>
            </div>
          )}

          {status === 'EXPIRED' && (
            <div className="bg-gray-50 border border-gray-300 text-gray-800 flex items-center space-x-3 p-1">
              <Clock className="w-5 h-5 text-gray-500 flex-shrink-0" />
              <div className="text-xs">
                <span className="font-bold block text-gray-900">
                  {lang === 'ml' ? 'പേയ്‌മെന്റ് സമയം കഴിഞ്ഞു' : 'Payment Expired'}
                </span>
                <span className="text-[11px] text-gray-600">
                  {lang === 'ml'
                    ? 'ഈ പേയ്‌മെന്റ് സെഷന്റെ സമയം കഴിഞ്ഞു. ദയവായി പുതിയ സെഷൻ ആരംഭിക്കുക.'
                    : 'The 5-minute checkout slot has expired.'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* DYNAMIC QR CODE & VPA CARD */}
        {!isTerminal && (
          <div className="space-y-3">
            <div className="flex flex-col items-center justify-center space-y-2 py-1">
              <div className="p-3 bg-white border border-sand-border shadow-xs rounded-sm">
                {upiUri ? (
                  <QRCodeSVG
                    value={upiUri}
                    size={185}
                    level="M"
                    includeMargin={false}
                    className="rounded-xs"
                  />
                ) : (
                  <div className="w-[185px] h-[185px] bg-sand/30 flex items-center justify-center text-xs text-charcoal-muted">
                    Generating QR...
                  </div>
                )}
              </div>

              {/* Supported Apps Visual Indicator */}
              <div className="flex items-center space-x-2 text-[10px] text-charcoal-muted uppercase tracking-wider font-mono">
                <span>Google Pay</span>
                <span>·</span>
                <span>PhonePe</span>
                <span>·</span>
                <span>Paytm</span>
                <span>·</span>
                <span>BHIM</span>
              </div>

              {/* Countdown Clock */}
              <div className="flex items-center space-x-1.5 text-xs text-charcoal-muted">
                <Clock className="w-3.5 h-3.5 text-amber-700" />
                <span>
                  {lang === 'ml' ? 'സെഷൻ കാലാവധി: ' : 'Session expires in: '}
                  <strong className="font-mono text-charcoal font-bold">{timeFormatted}</strong>
                </span>
              </div>
            </div>

            {/* Receiving VPA Card with 1-Click Copy */}
            {payeeVpa && (
              <div className="p-2.5 bg-sand/20 border border-sand-border rounded-sm flex items-center justify-between text-xs">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-charcoal-muted block font-semibold">
                    {lang === 'ml' ? 'സ്വീകർത്താവിന്റെ UPI ID' : 'Verified Receiving UPI ID'}
                  </span>
                  <span className="font-mono font-bold text-charcoal text-xs">{payeeVpa}</span>
                  {payeeName && <span className="text-[10px] text-charcoal-muted block">({payeeName})</span>}
                </div>
                <button
                  type="button"
                  onClick={copyVpa}
                  className="px-2.5 py-1 bg-ivory border border-sand-border text-charcoal text-[11px] font-semibold rounded hover:bg-sand/40 flex items-center space-x-1 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  <span>{isVpaCopied ? (lang === 'ml' ? 'പകർത്തി' : 'Copied') : (lang === 'ml' ? 'കോപ്പി' : 'Copy')}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* UPI Action Buttons */}
        <div className="space-y-2 pt-1">
          {upiUri && !isTerminal && (
            <button
              type="button"
              onClick={handleOpenUpiApp}
              disabled={isLaunchingApp}
              className="w-full py-3 bg-forest text-ivory text-xs uppercase tracking-widest font-semibold rounded-sm hover:bg-forest-light transition-all flex items-center justify-center space-x-2 border border-forest-dark shadow-sm active:scale-[0.99] disabled:opacity-85 cursor-pointer"
            >
              <Smartphone className={`w-4 h-4 ${isLaunchingApp ? 'animate-bounce' : ''}`} />
              <span>
                {isLaunchingApp
                  ? (lang === 'ml' ? 'UPI ആപ്പ് തുറക്കുന്നു...' : 'Launching UPI App...')
                  : (lang === 'ml' ? 'ഏതെങ്കിലും UPI ആപ്പിൽ തുറക്കുക' : 'Open in Any UPI App')}
              </span>
            </button>
          )}

          {/* Device Guidance / App Launch Fallback Banner */}
          {appLaunchFeedback && !isTerminal && (
            <div className="p-2.5 bg-amber-50/90 border border-amber-300 text-amber-950 text-xs rounded-sm flex items-start space-x-2 animate-fadeIn shadow-xs">
              <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-[11px] leading-relaxed">
                <p>{appLaunchFeedback}</p>
              </div>
              <button
                type="button"
                onClick={() => setAppLaunchFeedback(null)}
                className="text-amber-700 hover:text-amber-900 p-0.5"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {checkoutUrl && !isTerminal && (
            <a
              href={checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 bg-sand/20 border border-sand-border text-charcoal text-xs uppercase tracking-wider font-semibold rounded-sm hover:bg-sand/40 transition-all flex items-center justify-center space-x-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{lang === 'ml' ? 'ഔദ്യോഗിക YouPI പോർട്ടലിൽ തുറക്കുക' : 'Open Official Hosted Checkout'}</span>
            </a>
          )}

          {/* Copy Direct UPI Link */}
          {upiUri && !isTerminal && (
            <button
              type="button"
              onClick={copyUpiLink}
              className="w-full py-1.5 text-[11px] text-charcoal-muted hover:text-charcoal underline text-center"
            >
              {isCopied
                ? lang === 'ml' ? 'ലിങ്ക് പകർത്തി!' : 'UPI Link Copied!'
                : lang === 'ml' ? 'പൂർണ്ണ UPI ലിങ്ക് കോപ്പി ചെയ്യുക' : 'Copy Full Payment Link'}
            </button>
          )}

          {/* Guest Self-Report UTR Option */}
          {!isTerminal && !showUtrInput && (
            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => setShowUtrInput(true)}
                className="text-[11px] text-forest font-semibold hover:underline flex items-center justify-center mx-auto space-x-1"
              >
                <span>{lang === 'ml' ? 'പണം നൽകിക്കഴിഞ്ഞോ? ബാങ്ക് UTR നൽകുക' : 'Already transferred? Submit 12-digit Bank UTR'}</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Expandable Guest UTR Input */}
          {!isTerminal && showUtrInput && (
            <form onSubmit={handleGuestUtrSubmit} className="p-3 bg-sand/20 border border-sand-border rounded-sm space-y-2">
              <label className="block text-[11px] font-semibold text-charcoal">
                {lang === 'ml' ? 'ബാങ്ക് UTR / റഫറൻസ് നമ്പർ (12 അക്കങ്ങൾ)' : 'Enter 12-Digit Bank UTR / Reference No.'}
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  required
                  value={guestUtr}
                  onChange={(e) => setGuestUtr(e.target.value)}
                  placeholder="e.g. 412356789012"
                  className="flex-1 px-2.5 py-1.5 bg-ivory border border-sand-border rounded-sm text-xs font-mono text-charcoal"
                />
                <button
                  type="submit"
                  disabled={isSubmittingUtr}
                  className="px-3 py-1.5 bg-forest text-ivory text-xs font-semibold rounded-sm hover:bg-forest-light flex items-center space-x-1"
                >
                  <Send className="w-3 h-3" />
                  <span>{isSubmittingUtr ? '...' : (lang === 'ml' ? 'സമർപ്പിക്കുക' : 'Submit')}</span>
                </button>
              </div>
              {utrFeedback && <p className="text-[10px] text-amber-800">{utrFeedback}</p>}
            </form>
          )}

          {/* Terminal Actions (Done / Close) */}
          {isTerminal && (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 bg-forest text-ivory text-xs uppercase tracking-widest font-semibold rounded-sm hover:bg-forest-light transition-all flex items-center justify-center space-x-2"
            >
              <span>{lang === 'ml' ? 'പൂർത്തിയായി' : 'Done'}</span>
            </button>
          )}
        </div>

        {/* Security Disclaimers */}
        <div className="pt-2 border-t border-sand-border/50 text-center">
          <div className="flex items-center justify-center space-x-1 text-[10px] text-charcoal-muted">
            <ShieldCheck className="w-3.5 h-3.5 text-forest" />
            <span>
              {lang === 'ml'
                ? 'സുരക്ഷിതമായ നേരിട്ടുള്ള ബാങ്ക് കൈമാറ്റം | സീറോ പ്ലാറ്റ്‌ഫോം ഫീസ്'
                : 'NPCI Standard UPI | Zero Platform Transaction Fees'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
