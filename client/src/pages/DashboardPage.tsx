import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { WeddingInvitationSummary } from '../types';
import {
  User,
  ShieldCheck,
  Database,
  Calendar,
  Plus,
  RefreshCw,
  Edit3,
  Trash2,
  MapPin,
  Clock,
  AlertTriangle,
  Globe,
  Copy,
  Check,
  Share2,
  CheckCircle2,
} from 'lucide-react';
import { copyInvitationLink, shareInvitation } from '../utils/share';

interface DashboardPageProps {
  onNavigate: (view: 'landing' | 'login' | 'register' | 'dashboard') => void;
  onCreateNew: () => void;
  onOpenEditor: (invitationId: string) => void;
  onViewPublic?: (slug: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onCreateNew,
  onOpenEditor,
  onViewPublic,
}) => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [invitations, setInvitations] = useState<WeddingInvitationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<string>('checking...');
  const [error, setError] = useState<string | null>(null);

  // Delete modal state
  const [invitationToDelete, setInvitationToDelete] = useState<WeddingInvitationSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Link copy & share toast state
  const [toast, setToast] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const showToast = (type: 'success' | 'info' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((current) => (current?.message === message ? null : current));
    }, 3500);
  };

  const handleCopyLink = async (inv: WeddingInvitationSummary) => {
    if (!inv.isPublished) {
      showToast('info', 'Publish your invitation before sharing it with guests.');
      return;
    }
    const res = await copyInvitationLink(inv.slug);
    if (res.success) {
      setCopiedSlug(inv.slug);
      showToast('success', res.message);
      setTimeout(() => setCopiedSlug(null), 2500);
    } else {
      showToast('error', res.message);
    }
  };

  const handleShare = async (inv: WeddingInvitationSummary) => {
    if (!inv.isPublished) {
      showToast('info', 'Publish your invitation before sharing it with guests.');
      return;
    }
    const res = await shareInvitation(inv.titleEn, inv.slug);
    if (res.message) {
      showToast('success', res.message);
    }
  };

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Health check
      const health = await api.checkHealth().catch(() => null);
      if (health && health.database) {
        setDbStatus(health.database.status);
      } else {
        setDbStatus('offline');
      }

      // 2. Fetch owner invitations
      const res = await api.getOwnerInvitations();
      if (res.success && res.data) {
        setInvitations(res.data.invitations);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load owner dashboard data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      onNavigate('login');
      return;
    }

    if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [isAuthenticated, authLoading]);

  const confirmDelete = async () => {
    if (!invitationToDelete) return;
    setIsDeleting(true);
    try {
      const res = await api.deleteInvitation(invitationToDelete.id);
      if (res.success) {
        setInvitations((prev) => prev.filter((i) => i.id !== invitationToDelete.id));
        setInvitationToDelete(null);
      } else {
        setError(res.message || 'Failed to delete invitation.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete invitation.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (authLoading || (!user && isLoading)) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-24 text-center">
        <div className="inline-block animate-spin text-forest mb-4">
          <RefreshCw className="w-8 h-8" />
        </div>
        <p className="text-sm font-serif text-forest tracking-wider">
          Loading Owner Suite...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Top Header / Greeting & Action */}
      <div className="border-b border-sand-border pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[11px] uppercase tracking-widest text-forest font-semibold block mb-1">
            Owner Management Suite · Phase 2
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif text-charcoal">
            Welcome, {user?.fullName}
          </h1>
          <p className="text-xs text-charcoal-muted mt-1 font-mono">
            {user?.email} · Role: {user?.role}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchDashboardData}
            disabled={isLoading}
            className="p-2.5 text-charcoal-muted hover:text-forest bg-sand/30 hover:bg-sand/60 border border-sand-border rounded-sm transition-colors text-xs flex items-center space-x-1"
            title="Refresh dashboard"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>

          <button
            onClick={onCreateNew}
            className="px-5 py-2.5 bg-forest text-ivory text-xs uppercase tracking-widest font-semibold rounded-sm hover:bg-forest-light transition-all flex items-center space-x-2 border border-forest-dark shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create Invitation</span>
          </button>
        </div>
      </div>

      {/* System Status Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-ivory-surface rounded-sm border border-sand-border flex items-center space-x-3">
          <div className="w-8 h-8 rounded-sm bg-forest/10 flex items-center justify-center text-forest">
            <User className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-charcoal-muted">
              Owner Account
            </span>
            <span className="text-sm font-medium text-charcoal">
              {user?.fullName}
            </span>
          </div>
        </div>

        <div className="p-4 bg-ivory-surface rounded-sm border border-sand-border flex items-center space-x-3">
          <div className="w-8 h-8 rounded-sm bg-forest/10 flex items-center justify-center text-forest">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-charcoal-muted">
              PostgreSQL Database
            </span>
            <div className="flex items-center space-x-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  dbStatus === 'connected' ? 'bg-emerald-600' : 'bg-amber-500'
                }`}
              ></span>
              <span className="text-sm font-medium text-charcoal capitalize">
                {dbStatus}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-ivory-surface rounded-sm border border-sand-border flex items-center space-x-3">
          <div className="w-8 h-8 rounded-sm bg-forest/10 flex items-center justify-center text-forest">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-charcoal-muted">
              Security Protocol
            </span>
            <span className="text-sm font-medium text-charcoal">
              Authenticated Owner Session
            </span>
          </div>
        </div>
      </div>

      {/* Invitations Section */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-serif text-charcoal">Your Wedding Invitations</h2>
            <p className="text-xs text-charcoal-muted">
              Private wedding suites under your direct ownership
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs rounded-sm flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Clean Empty State when no invitations exist (strictly zero fake cards or fake stats) */}
        {invitations.length === 0 ? (
          <div className="border border-dashed border-sand-border bg-ivory-surface/70 rounded-sm p-12 sm:p-16 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-sand/40 border border-sand-border flex items-center justify-center text-forest">
              <Calendar className="w-6 h-6" />
            </div>

            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-serif text-forest">
                No Wedding Invitations Created Yet
              </h3>
              <p className="text-xs text-charcoal-muted mt-2 leading-relaxed">
                You have not created any wedding invitations yet. Click below to begin composing your first sacred celebration using the multi-step creation wizard.
              </p>
              <div className="pt-4">
                <button
                  onClick={onCreateNew}
                  className="px-6 py-3 bg-forest text-ivory text-xs uppercase tracking-widest font-semibold rounded-sm hover:bg-forest-light transition-all inline-flex items-center space-x-2 border border-forest-dark shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Launch Wedding Creation Wizard</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Real Invitations Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="p-6 bg-ivory-surface border border-sand-border rounded-sm shadow-sm hover:border-forest/40 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <span
                      className={`text-[9px] uppercase tracking-widest px-2.5 py-0.5 rounded-sm font-semibold border ${
                        inv.isPublished
                          ? 'bg-forest text-ivory border-forest'
                          : 'bg-sand/50 text-charcoal border-sand-border'
                      }`}
                    >
                      {inv.isPublished ? 'Published' : 'Draft'}
                    </span>
                    <span className="text-[11px] font-mono text-charcoal-muted">
                      /{inv.slug}
                    </span>
                  </div>

                  <h3 className="font-serif text-xl text-forest font-semibold leading-snug">
                    {inv.titleEn}
                  </h3>

                  {inv.titleMl && (
                    <p className="text-sm font-malayalam text-charcoal-muted">
                      {inv.titleMl}
                    </p>
                  )}

                  {inv.coupleDetails && (
                    <p className="text-xs text-charcoal font-medium">
                      {inv.coupleDetails.partner1NameEn} & {inv.coupleDetails.partner2NameEn}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-4 text-[11px] text-charcoal-muted pt-2 border-t border-sand-border/50">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-forest" />
                      <span>
                        {inv.weddingDate
                          ? new Date(inv.weddingDate).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'Date TBD'}
                      </span>
                    </span>

                    {inv._count && (
                      <>
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-forest" />
                          <span>{inv._count.events} Events</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-forest" />
                          <span>{inv._count.venues || 1} Venues</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex flex-wrap items-center justify-between pt-4 border-t border-sand-border/70 gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => onOpenEditor(inv.id)}
                      className="px-3.5 py-2 bg-forest text-ivory text-xs uppercase tracking-wider font-semibold rounded-sm hover:bg-forest-light transition-all flex items-center space-x-1.5 border border-forest-dark shadow-sm"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Open Editor</span>
                    </button>

                    {inv.isPublished && onViewPublic && (
                      <button
                        onClick={() => onViewPublic(inv.slug)}
                        className="px-3 py-2 bg-sand/30 hover:bg-sand/60 text-forest text-xs uppercase tracking-wider font-semibold rounded-sm border border-sand-border transition-all flex items-center space-x-1"
                        title="View published public invitation"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">View Public</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleCopyLink(inv)}
                      className={`px-3 py-2 text-xs uppercase tracking-wider font-semibold rounded-sm border transition-all flex items-center space-x-1.5 ${
                        inv.isPublished
                          ? 'bg-sand/30 hover:bg-sand/60 text-forest border-sand-border cursor-pointer'
                          : 'bg-sand/10 text-charcoal-muted/40 border-sand-border/30 cursor-not-allowed'
                      }`}
                      title={
                        inv.isPublished
                          ? 'Copy public invitation link'
                          : 'Publish your invitation before sharing it with guests.'
                      }
                    >
                      {copiedSlug === inv.slug ? (
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedSlug === inv.slug ? 'Copied' : 'Copy Link'}</span>
                    </button>

                    <button
                      onClick={() => handleShare(inv)}
                      className={`px-3 py-2 text-xs uppercase tracking-wider font-semibold rounded-sm border transition-all flex items-center space-x-1.5 ${
                        inv.isPublished
                          ? 'bg-sand/30 hover:bg-sand/60 text-forest border-sand-border cursor-pointer'
                          : 'bg-sand/10 text-charcoal-muted/40 border-sand-border/30 cursor-not-allowed'
                      }`}
                      title={
                        inv.isPublished
                          ? 'Share invitation'
                          : 'Publish your invitation before sharing it with guests.'
                      }
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setInvitationToDelete(inv)}
                    className="p-2 text-charcoal-muted hover:text-red-700 transition-colors rounded self-end sm:self-center"
                    title="Delete Draft"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Draft Confirmation Modal */}
      {invitationToDelete && (
        <div className="fixed inset-0 z-50 bg-charcoal/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-ivory-surface p-6 sm:p-8 rounded-sm border border-sand-border max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center space-x-3 text-red-800">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="font-serif text-lg text-charcoal font-bold">
                Confirm Draft Deletion
              </h3>
            </div>
            <p className="text-xs text-charcoal-muted leading-relaxed">
              Are you sure you want to delete{' '}
              <strong className="text-charcoal">{invitationToDelete.titleEn}</strong> (/{invitationToDelete.slug})?
              All associated ceremonial events, venues, and couple records will be permanently removed.
            </p>
            <div className="flex justify-end space-x-3 pt-3 border-t border-sand-border/60">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setInvitationToDelete(null)}
                className="px-4 py-2 border border-sand-border text-xs uppercase tracking-wider rounded-sm text-charcoal-muted hover:text-charcoal"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="px-5 py-2 bg-red-800 text-ivory text-xs uppercase tracking-widest font-semibold rounded-sm hover:bg-red-900 transition-all flex items-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-sm text-xs shadow-lg flex items-center space-x-2.5 border transition-all animate-fadeIn ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : toast.type === 'info'
              ? 'bg-sand/80 border-sand-border text-charcoal'
              : 'bg-red-50 border-red-300 text-red-900'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
          ) : toast.type === 'info' ? (
            <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-700 flex-shrink-0" />
          )}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
};
