import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import {
  WeddingGuest,
  GuestRsvpRecord,
  AttendanceStats,
  FamilySide,
  GuestRegistration,
  GuestRegistrationSummary,
} from '../../types';
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  Search,
  Download,
  CheckCircle2,
  AlertCircle,
  Save,
  BarChart3,
  MessageSquare,
  RefreshCw,
  FileSpreadsheet,
  Heart,
  Phone,
  MapPin,
  X,
  Eye,
} from 'lucide-react';

interface GuestManagementProps {
  invitationId: string;
}

type GuestTab = 'registrations' | 'overview' | 'guests' | 'rsvps' | 'stats' | 'export';

export const GuestManagement: React.FC<GuestManagementProps> = ({ invitationId }) => {
  const [activeTab, setActiveTab] = useState<GuestTab>('registrations');
  const [registrations, setRegistrations] = useState<GuestRegistration[]>([]);
  const [regSummary, setRegSummary] = useState<GuestRegistrationSummary | null>(null);
  const [isLoadingRegistrations, setIsLoadingRegistrations] = useState(false);
  const [regSearchTerm, setRegSearchTerm] = useState('');
  const [regFilterSide, setRegFilterSide] = useState<string>('');
  const [selectedRegDetail, setSelectedRegDetail] = useState<GuestRegistration | null>(null);

  const [guests, setGuests] = useState<WeddingGuest[]>([]);
  const [rsvps, setRsvps] = useState<GuestRsvpRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Guest form
  const [editingGuest, setEditingGuest] = useState<Partial<WeddingGuest> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Search/filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSide, setFilterSide] = useState<string>('');
  const [filterRsvpStatus, setFilterRsvpStatus] = useState<string>('');

  const triggerFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Data loading for Publicly Registered Guests
  const loadGuestRegistrations = useCallback(async () => {
    setIsLoadingRegistrations(true);
    try {
      const res = await api.getGuestRegistrations(invitationId);
      if (res.success && res.data) {
        setRegistrations(res.data.registrations);
        setRegSummary(res.data.summary);
      }
    } catch (err: any) {
      console.error('Load guest registrations error:', err);
    } finally {
      setIsLoadingRegistrations(false);
    }
  }, [invitationId]);

  const handleDeleteRegistration = async (registrationId: string) => {
    if (!window.confirm('Delete this registered guest record?')) return;
    try {
      const res = await api.deleteGuestRegistration(invitationId, registrationId);
      if (res.success) {
        triggerFeedback('success', 'Guest registration deleted.');
        loadGuestRegistrations();
      }
    } catch (err: any) {
      triggerFeedback('error', err.message || 'Failed to delete registration.');
    }
  };

  const handleExportRegistrationsCsv = async () => {
    try {
      const response = await api.exportGuestRegistrationsCsv(invitationId);
      if (!response.ok) {
        triggerFeedback('error', 'Failed to export registered guests CSV.');
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `registered-guests-${invitationId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      triggerFeedback('success', 'Registered guests exported successfully.');
    } catch (err: any) {
      triggerFeedback('error', err.message || 'Export failed.');
    }
  };

  // Data loading
  const loadGuests = useCallback(async () => {
    try {
      const res = await api.getGuests(invitationId, {
        search: searchTerm || undefined,
        side: filterSide || undefined,
        rsvpStatus: filterRsvpStatus || undefined,
      });
      if (res.success && res.data) {
        setGuests(res.data.guests);
      }
    } catch (err: any) {
      console.error('Load guests error:', err);
    }
  }, [invitationId, searchTerm, filterSide, filterRsvpStatus]);

  const loadRsvps = useCallback(async () => {
    try {
      const res = await api.getRsvps(invitationId);
      if (res.success && res.data) {
        setRsvps(res.data.rsvps);
      }
    } catch (err: any) {
      console.error('Load RSVPs error:', err);
    }
  }, [invitationId]);

  const loadStats = useCallback(async () => {
    try {
      const res = await api.getAttendanceStats(invitationId);
      if (res.success && res.data) {
        setStats(res.data.stats);
      }
    } catch (err: any) {
      console.error('Load stats error:', err);
    }
  }, [invitationId]);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([loadGuestRegistrations(), loadGuests(), loadRsvps(), loadStats()]);
    setIsLoading(false);
  }, [loadGuestRegistrations, loadGuests, loadRsvps, loadStats]);

  useEffect(() => {
    loadAll();
  }, [invitationId]);

  useEffect(() => {
    loadGuests();
  }, [searchTerm, filterSide, filterRsvpStatus]);

  // Guest CRUD
  const handleSaveGuest = async () => {
    if (!editingGuest) return;
    setIsSaving(true);
    try {
      if (editingGuest.id) {
        const res = await api.updateGuest(invitationId, editingGuest.id, editingGuest);
        if (res.success) {
          triggerFeedback('success', 'Guest updated.');
          setEditingGuest(null);
          loadGuests();
          loadStats();
        }
      } else {
        const res = await api.addGuest(invitationId, editingGuest);
        if (res.success) {
          triggerFeedback('success', 'Guest added to invitation list.');
          setEditingGuest(null);
          loadGuests();
          loadStats();
        }
      }
    } catch (err: any) {
      triggerFeedback('error', err.message || 'Failed to save guest.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGuest = async (guestId: string) => {
    if (!window.confirm('Remove this guest from the invitation list?')) return;
    try {
      const res = await api.deleteGuest(invitationId, guestId);
      if (res.success) {
        triggerFeedback('success', 'Guest removed.');
        loadGuests();
        loadStats();
      }
    } catch (err: any) {
      triggerFeedback('error', err.message || 'Failed to remove guest.');
    }
  };

  const handleExportCsv = async () => {
    try {
      const response = await api.exportGuestsCsv(invitationId);
      if (!response.ok) {
        triggerFeedback('error', 'Failed to export CSV.');
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `guests-${invitationId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      triggerFeedback('success', 'Guest data exported as CSV.');
    } catch (err: any) {
      triggerFeedback('error', err.message || 'Export failed.');
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ATTENDING: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      DECLINED: 'bg-red-100 text-red-800 border-red-300',
      TENTATIVE: 'bg-amber-100 text-amber-800 border-amber-300',
      PENDING: 'bg-gray-100 text-gray-600 border-gray-300',
    };
    return (
      <span className={`px-2 py-0.5 text-[10px] uppercase tracking-widest font-semibold rounded border ${colors[status] || colors.PENDING}`}>
        {status}
      </span>
    );
  };

  const tabs: { id: GuestTab; label: string; icon: any }[] = [
    { id: 'registrations', label: 'Registered Guests', icon: Heart },
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'guests', label: 'Invited Guest List', icon: Users },
    { id: 'rsvps', label: 'RSVP Responses', icon: MessageSquare },
    { id: 'stats', label: 'Attendance Stats', icon: BarChart3 },
    { id: 'export', label: 'Export', icon: FileSpreadsheet },
  ];

  const filteredRegistrations = registrations.filter((reg) => {
    if (regFilterSide && reg.side !== regFilterSide) return false;
    if (regSearchTerm) {
      const term = regSearchTerm.toLowerCase();
      const matchName = reg.fullName.toLowerCase().includes(term);
      const matchAddress = (reg.address || '').toLowerCase().includes(term);
      const matchMobile = (reg.mobileNumber || '').includes(term);
      const matchNote = (reg.note || '').toLowerCase().includes(term);
      return matchName || matchAddress || matchMobile || matchNote;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="border-b border-sand-border/70 pb-3 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-serif text-forest">Guest & RSVP Management</h2>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Manage invited guests, track RSVPs, and view attendance statistics.
          </p>
        </div>
        <button
          type="button"
          onClick={loadAll}
          disabled={isLoading}
          className="px-4 py-2 bg-sand/40 hover:bg-sand border border-sand-border text-charcoal text-xs uppercase tracking-widest font-semibold rounded-sm flex items-center space-x-1"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`p-3 rounded-sm text-xs flex items-center space-x-2 ${
          feedback.type === 'success'
            ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
            : 'bg-red-50 border border-red-300 text-red-900'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 p-1 bg-sand/30 border border-sand-border rounded-sm">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-sm text-xs uppercase tracking-wider font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-forest text-ivory shadow-sm'
                  : 'text-charcoal hover:bg-sand/40'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB: REGISTERED GUESTS (PRIVATE GUEST REGISTRATION) */}
      {activeTab === 'registrations' && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-ivory border border-sand-border rounded-sm text-center shadow-xs">
              <div className="w-8 h-8 mx-auto rounded-full bg-sand/30 flex items-center justify-center text-forest mb-2">
                <Users className="w-4 h-4" />
              </div>
              <p className="text-3xl font-serif font-bold text-forest">
                {regSummary ? regSummary.total : 0}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-charcoal-muted mt-1 font-semibold">
                Total Registered Guests
              </p>
            </div>

            <div className="p-4 bg-ivory border border-sand-border rounded-sm text-center shadow-xs">
              <div className="w-8 h-8 mx-auto rounded-full bg-rose-50 flex items-center justify-center text-rose-800 mb-2">
                <Heart className="w-4 h-4" />
              </div>
              <p className="text-3xl font-serif font-bold text-rose-900">
                {regSummary ? regSummary.brideCount : 0}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-charcoal-muted mt-1 font-semibold">
                Bride's Side Count
              </p>
            </div>

            <div className="p-4 bg-ivory border border-sand-border rounded-sm text-center shadow-xs">
              <div className="w-8 h-8 mx-auto rounded-full bg-emerald-50 flex items-center justify-center text-emerald-800 mb-2">
                <Heart className="w-4 h-4" />
              </div>
              <p className="text-3xl font-serif font-bold text-forest">
                {regSummary ? regSummary.groomCount : 0}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-charcoal-muted mt-1 font-semibold">
                Groom's Side Count
              </p>
            </div>
          </div>

          {/* Action & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-sand/20 border border-sand-border rounded-sm">
            <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-charcoal-muted" />
                <input
                  type="text"
                  value={regSearchTerm}
                  onChange={(e) => setRegSearchTerm(e.target.value)}
                  placeholder="Search by name, mobile, address, or note..."
                  className="w-full pl-9 pr-3 py-2 bg-ivory border border-sand-border rounded-sm text-xs text-charcoal placeholder-charcoal-muted/60 focus:outline-none focus:border-forest"
                />
              </div>

              {/* Side Filter Pills */}
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setRegFilterSide('')}
                  className={`px-3 py-1.5 text-xs rounded-sm font-medium transition-colors ${
                    regFilterSide === ''
                      ? 'bg-forest text-ivory'
                      : 'bg-ivory border border-sand-border text-charcoal hover:bg-sand/30'
                  }`}
                >
                  All ({registrations.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRegFilterSide('BRIDE')}
                  className={`px-3 py-1.5 text-xs rounded-sm font-medium transition-colors ${
                    regFilterSide === 'BRIDE'
                      ? 'bg-forest text-ivory'
                      : 'bg-ivory border border-sand-border text-charcoal hover:bg-sand/30'
                  }`}
                >
                  Bride ({regSummary?.brideCount || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setRegFilterSide('GROOM')}
                  className={`px-3 py-1.5 text-xs rounded-sm font-medium transition-colors ${
                    regFilterSide === 'GROOM'
                      ? 'bg-forest text-ivory'
                      : 'bg-ivory border border-sand-border text-charcoal hover:bg-sand/30'
                  }`}
                >
                  Groom ({regSummary?.groomCount || 0})
                </button>
              </div>
            </div>

            {/* Export Registrations CSV Button */}
            <button
              type="button"
              onClick={handleExportRegistrationsCsv}
              disabled={registrations.length === 0}
              className="px-3.5 py-2 bg-ivory hover:bg-sand/40 border border-sand-border text-charcoal text-xs uppercase tracking-wider font-semibold rounded-sm flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Registrations List */}
          {isLoadingRegistrations ? (
            <p className="text-xs text-charcoal-muted text-center py-10 italic">
              Loading registered guests...
            </p>
          ) : filteredRegistrations.length === 0 ? (
            <div className="p-12 bg-ivory border border-sand-border rounded-sm text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-sand/30 flex items-center justify-center text-charcoal-muted">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg text-forest font-bold">No Guest Responses Yet</h3>
              <p className="text-xs text-charcoal-muted max-w-md mx-auto leading-relaxed">
                When guests share their details through the public invitation ("We'd Love to Have You With Us"), their responses will appear privately here.
              </p>
            </div>
          ) : (
            <div className="bg-ivory border border-sand-border rounded-sm overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-sand/30 border-b border-sand-border text-[10px] uppercase tracking-wider text-charcoal font-semibold">
                    <tr>
                      <th className="p-3.5">Guest Name</th>
                      <th className="p-3.5">Side</th>
                      <th className="p-3.5">Mobile</th>
                      <th className="p-3.5">Address</th>
                      <th className="p-3.5">Personal Note</th>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand-border/50">
                    {filteredRegistrations.map((reg) => (
                      <tr key={reg.id} className="hover:bg-sand/10 transition-colors">
                        <td className="p-3.5 font-medium text-charcoal font-serif text-sm">
                          {reg.fullName}
                        </td>
                        <td className="p-3.5">
                          {reg.side === 'BRIDE' ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold bg-rose-50 text-rose-900 border border-rose-200">
                              <span>Bride's Side</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold bg-emerald-50 text-emerald-900 border border-emerald-200">
                              <span>Groom's Side</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-charcoal font-mono text-[11px]">
                          {reg.mobileNumber ? (
                            <a
                              href={`tel:${reg.mobileNumber}`}
                              className="text-forest hover:underline inline-flex items-center space-x-1"
                              title="Call guest"
                            >
                              <Phone className="w-3 h-3 text-charcoal-muted" />
                              <span>{reg.mobileNumber}</span>
                            </a>
                          ) : (
                            <span className="text-charcoal-muted">—</span>
                          )}
                        </td>
                        <td className="p-3.5 text-charcoal-muted max-w-[180px] truncate" title={reg.address || ''}>
                          {reg.address ? (
                            <span className="inline-flex items-center space-x-1">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{reg.address}</span>
                            </span>
                          ) : (
                            <span className="text-charcoal-muted">—</span>
                          )}
                        </td>
                        <td className="p-3.5 text-charcoal max-w-[200px]">
                          {reg.note ? (
                            <button
                              type="button"
                              onClick={() => setSelectedRegDetail(reg)}
                              className="text-left group flex items-start space-x-1 text-forest hover:underline"
                            >
                              <span className="truncate max-w-[160px] text-xs font-serif italic block">
                                "{reg.note}"
                              </span>
                            </button>
                          ) : (
                            <span className="text-charcoal-muted italic">—</span>
                          )}
                        </td>
                        <td className="p-3.5 text-[11px] font-mono text-charcoal-muted whitespace-nowrap">
                          {new Date(reg.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="p-3.5 text-right whitespace-nowrap space-x-1">
                          <button
                            type="button"
                            onClick={() => setSelectedRegDetail(reg)}
                            className="p-1.5 text-forest hover:bg-sand/40 rounded transition-colors"
                            title="View complete details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRegistration(reg.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete registration"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* COMPLETE GUEST DETAILS MODAL */}
          {selectedRegDetail && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/70 backdrop-blur-xs p-4 animate-fadeIn">
              <div className="bg-ivory border border-sand-border rounded-sm max-w-lg w-full p-6 shadow-2xl relative space-y-5 max-h-[90vh] overflow-y-auto">
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setSelectedRegDetail(null)}
                  className="absolute top-4 right-4 text-charcoal-muted hover:text-charcoal p-1 transition-colors"
                  title="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Modal Header */}
                <div className="border-b border-sand-border pb-3">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-forest font-semibold block">
                    Registered Guest Details
                  </span>
                  <h3 className="text-2xl font-serif font-bold text-forest mt-1">
                    {selectedRegDetail.fullName}
                  </h3>
                  <div className="flex items-center space-x-2 mt-2">
                    {selectedRegDetail.side === 'BRIDE' ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-[10px] uppercase font-mono font-bold bg-rose-50 text-rose-900 border border-rose-200">
                        <span>Bride's Side</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-[10px] uppercase font-mono font-bold bg-emerald-50 text-emerald-900 border border-emerald-200">
                        <span>Groom's Side</span>
                      </span>
                    )}
                    <span className="text-xs text-charcoal-muted font-mono">
                      Registered on{' '}
                      {new Date(selectedRegDetail.createdAt).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {/* Fields */}
                <div className="space-y-4 text-xs">
                  {/* Contact & Location */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-sand/20 border border-sand-border rounded-sm">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-charcoal-muted block mb-1">
                        Mobile Number
                      </span>
                      {selectedRegDetail.mobileNumber ? (
                        <a
                          href={`tel:${selectedRegDetail.mobileNumber}`}
                          className="font-mono text-sm text-forest font-bold hover:underline inline-flex items-center space-x-1"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>{selectedRegDetail.mobileNumber}</span>
                        </a>
                      ) : (
                        <span className="text-charcoal-muted italic">Not provided</span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-semibold text-charcoal-muted block mb-1">
                        Address
                      </span>
                      {selectedRegDetail.address ? (
                        <p className="text-charcoal leading-relaxed">
                          {selectedRegDetail.address}
                        </p>
                      ) : (
                        <span className="text-charcoal-muted italic">Not provided</span>
                      )}
                    </div>
                  </div>

                  {/* Personal Note */}
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-charcoal-muted block mb-1.5">
                      Personal Note for the Couple
                    </span>
                    {selectedRegDetail.note ? (
                      <div className="p-4 bg-sand/10 border-l-2 border-forest rounded-sm text-charcoal leading-relaxed whitespace-pre-wrap font-serif italic text-sm">
                        "{selectedRegDetail.note}"
                      </div>
                    ) : (
                      <div className="p-3 bg-sand/10 rounded-sm text-charcoal-muted italic">
                        No personal note was left with this registration.
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Modal Action */}
                <div className="pt-3 border-t border-sand-border flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedRegDetail(null)}
                    className="px-4 py-2 bg-forest text-ivory text-xs uppercase tracking-wider font-semibold rounded-sm hover:bg-forest-light"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-ivory border border-sand-border rounded-sm text-center">
                <p className="text-2xl font-serif font-bold text-forest">{stats.totalInvitedGuests}</p>
                <p className="text-[10px] uppercase tracking-widest text-charcoal-muted mt-1">Invited Guests</p>
              </div>
              <div className="p-4 bg-ivory border border-sand-border rounded-sm text-center">
                <p className="text-2xl font-serif font-bold text-forest">{stats.totalInvitedPeople}</p>
                <p className="text-[10px] uppercase tracking-widest text-charcoal-muted mt-1">Total Invited</p>
              </div>
              <div className="p-4 bg-ivory border border-sand-border rounded-sm text-center">
                <p className="text-2xl font-serif font-bold text-emerald-700">{stats.totalConfirmedAttendees}</p>
                <p className="text-[10px] uppercase tracking-widest text-charcoal-muted mt-1">Confirmed Attendees</p>
              </div>
              <div className="p-4 bg-ivory border border-sand-border rounded-sm text-center">
                <p className="text-2xl font-serif font-bold text-red-600">{stats.declined}</p>
                <p className="text-[10px] uppercase tracking-widest text-charcoal-muted mt-1">Declined</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-charcoal-muted text-center py-8 italic">Loading statistics...</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-ivory border border-sand-border rounded-sm">
              <h3 className="font-serif text-sm font-bold text-forest mb-3">Recent RSVPs</h3>
              {rsvps.length === 0 ? (
                <p className="text-xs text-charcoal-muted italic">No RSVP responses yet.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {rsvps.slice(0, 5).map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-xs">
                      <span className="font-medium text-charcoal">{r.guestName}</span>
                      {statusBadge(r.status)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-ivory border border-sand-border rounded-sm">
              <h3 className="font-serif text-sm font-bold text-forest mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => { setActiveTab('guests'); setEditingGuest({ name: '', invitedCount: 1, side: 'GROOM' as FamilySide }); }}
                  className="w-full px-3 py-2 bg-forest text-ivory text-xs uppercase tracking-widest font-semibold rounded-sm hover:bg-forest-light flex items-center space-x-1.5 justify-center"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Guest</span>
                </button>
                <button
                  onClick={handleExportCsv}
                  className="w-full px-3 py-2 bg-sand/40 hover:bg-sand border border-sand-border text-charcoal text-xs uppercase tracking-widest font-semibold rounded-sm flex items-center space-x-1.5 justify-center"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: GUEST LIST */}
      {activeTab === 'guests' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-charcoal-muted" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, phone, or email..."
                className="w-full pl-9 pr-3 py-2 bg-ivory border border-sand-border rounded-sm text-xs text-charcoal focus:outline-none focus:border-forest"
              />
            </div>
            <select
              value={filterSide}
              onChange={(e) => setFilterSide(e.target.value)}
              className="px-3 py-2 bg-ivory border border-sand-border rounded-sm text-xs text-charcoal"
            >
              <option value="">All Sides</option>
              <option value="GROOM">Groom's Side</option>
              <option value="BRIDE">Bride's Side</option>
              <option value="BOTH">Both</option>
            </select>
            <select
              value={filterRsvpStatus}
              onChange={(e) => setFilterRsvpStatus(e.target.value)}
              className="px-3 py-2 bg-ivory border border-sand-border rounded-sm text-xs text-charcoal"
            >
              <option value="">All RSVP</option>
              <option value="ATTENDING">Attending</option>
              <option value="DECLINED">Declined</option>
              <option value="PENDING">Pending</option>
            </select>
            <button
              type="button"
              onClick={() => setEditingGuest({ name: '', invitedCount: 1, side: 'GROOM' as FamilySide })}
              className="px-4 py-2 bg-forest text-ivory text-xs uppercase tracking-widest font-semibold rounded-sm hover:bg-forest-light flex items-center space-x-1 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Guest</span>
            </button>
          </div>

          {/* Guest Editor Form */}
          {editingGuest && (
            <div className="p-5 bg-sand/20 border border-sand-border rounded-sm space-y-4">
              <div className="flex justify-between items-center border-b border-sand-border/60 pb-2">
                <span className="font-serif font-bold text-forest text-sm">
                  {editingGuest.id ? 'Edit Guest' : 'Add New Guest'}
                </span>
                <button type="button" onClick={() => setEditingGuest(null)} className="text-xs text-charcoal-muted hover:text-charcoal">
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1.5">Guest Name *</label>
                  <input
                    type="text"
                    value={editingGuest.name || ''}
                    onChange={(e) => setEditingGuest((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-ivory border border-sand-border rounded-sm text-xs text-charcoal focus:outline-none focus:border-forest"
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1.5">Phone</label>
                  <input
                    type="tel"
                    value={editingGuest.phone || ''}
                    onChange={(e) => setEditingGuest((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full px-3 py-2 bg-ivory border border-sand-border rounded-sm text-xs text-charcoal focus:outline-none focus:border-forest"
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1.5">Email</label>
                  <input
                    type="email"
                    value={editingGuest.email || ''}
                    onChange={(e) => setEditingGuest((p) => ({ ...p, email: e.target.value }))}
                    className="w-full px-3 py-2 bg-ivory border border-sand-border rounded-sm text-xs text-charcoal focus:outline-none focus:border-forest"
                    placeholder="guest@email.com"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1.5">Side</label>
                  <select
                    value={editingGuest.side || 'GROOM'}
                    onChange={(e) => setEditingGuest((p) => ({ ...p, side: e.target.value as FamilySide }))}
                    className="w-full px-3 py-2 bg-ivory border border-sand-border rounded-sm text-xs text-charcoal"
                  >
                    <option value="GROOM">Groom's Side</option>
                    <option value="BRIDE">Bride's Side</option>
                    <option value="BOTH">Both</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1.5">Group</label>
                  <input
                    type="text"
                    value={editingGuest.guestGroup || ''}
                    onChange={(e) => setEditingGuest((p) => ({ ...p, guestGroup: e.target.value }))}
                    className="w-full px-3 py-2 bg-ivory border border-sand-border rounded-sm text-xs text-charcoal focus:outline-none focus:border-forest"
                    placeholder="e.g. Family, Friends, Colleagues"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1.5">Invited Count</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={editingGuest.invitedCount || 1}
                    onChange={(e) => setEditingGuest((p) => ({ ...p, invitedCount: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 bg-ivory border border-sand-border rounded-sm text-xs text-charcoal focus:outline-none focus:border-forest"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1.5">Notes</label>
                <textarea
                  value={editingGuest.notes || ''}
                  onChange={(e) => setEditingGuest((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 bg-ivory border border-sand-border rounded-sm text-xs text-charcoal focus:outline-none focus:border-forest"
                  placeholder="Optional notes about the guest..."
                />
              </div>

              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setEditingGuest(null)} className="px-4 py-2 border border-sand-border text-xs uppercase tracking-wider rounded-sm text-charcoal-muted">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSaving || !editingGuest.name}
                  onClick={handleSaveGuest}
                  className="px-5 py-2 bg-forest text-ivory text-xs uppercase tracking-widest font-semibold rounded-sm hover:bg-forest-light flex items-center space-x-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save Guest'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Guest List */}
          <div className="space-y-2">
            {guests.length === 0 ? (
              <p className="text-xs text-charcoal-muted italic py-8 text-center">
                No guests found. Add guests to your invitation list above.
              </p>
            ) : (
              guests.map((g) => {
                const latestRsvp = g.rsvps && g.rsvps.length > 0 ? g.rsvps[0] : null;
                return (
                  <div key={g.id} className="p-4 bg-ivory border border-sand-border rounded-sm flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="font-bold text-sm text-charcoal">{g.name}</span>
                        {g.side && (
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-sand/40 border border-sand-border rounded text-charcoal-muted">
                            {g.side}
                          </span>
                        )}
                        {g.guestGroup && (
                          <span className="text-[10px] text-charcoal-muted">· {g.guestGroup}</span>
                        )}
                        {latestRsvp ? statusBadge(latestRsvp.status) : statusBadge('PENDING')}
                      </div>
                      <div className="text-[11px] text-charcoal-muted mt-0.5 space-x-3">
                        {g.phone && <span>📱 {g.phone}</span>}
                        {g.email && <span>✉ {g.email}</span>}
                        <span>Invited: {g.invitedCount}</span>
                        {latestRsvp && latestRsvp.status === 'ATTENDING' && (
                          <span className="text-emerald-700 font-semibold">Attending: {latestRsvp.attendeeCount}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-2">
                      <button type="button" onClick={() => setEditingGuest(g)} className="p-1.5 text-charcoal-muted hover:text-forest" title="Edit">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => handleDeleteGuest(g.id)} className="p-1.5 text-charcoal-muted hover:text-red-700" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB: RSVP RESPONSES */}
      {activeTab === 'rsvps' && (
        <div className="space-y-4">
          <div className="text-xs text-charcoal-muted">
            {rsvps.length} RSVP response{rsvps.length !== 1 ? 's' : ''} received
          </div>
          {rsvps.length === 0 ? (
            <p className="text-xs text-charcoal-muted italic py-8 text-center">
              No RSVP responses have been submitted yet.
            </p>
          ) : (
            <div className="space-y-3">
              {rsvps.map((r) => (
                <div key={r.id} className="p-4 bg-ivory border border-sand-border rounded-sm space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-charcoal">{r.guestName}</span>
                      {statusBadge(r.status)}
                    </div>
                    <span className="text-[10px] font-mono text-charcoal-muted">
                      {new Date(r.submittedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-charcoal-muted">
                    <div>
                      <span className="font-semibold text-charcoal">Contact:</span>{' '}
                      {r.phone || r.guestContact || '—'}
                    </div>
                    <div>
                      <span className="font-semibold text-charcoal">Email:</span>{' '}
                      {r.email || '—'}
                    </div>
                    <div>
                      <span className="font-semibold text-charcoal">Attendees:</span>{' '}
                      {r.attendeeCount}
                    </div>
                    <div>
                      <span className="font-semibold text-charcoal">Side:</span>{' '}
                      {r.guest?.side || 'Unlinked'}
                    </div>
                  </div>
                  {r.accompanyingNames && (
                    <p className="text-[11px] text-charcoal-muted">
                      <span className="font-semibold text-charcoal">Accompanying:</span> {r.accompanyingNames}
                    </p>
                  )}
                  {r.dietaryPreferences && (
                    <p className="text-[11px] text-charcoal-muted">
                      <span className="font-semibold text-charcoal">Dietary:</span> {r.dietaryPreferences}
                    </p>
                  )}
                  {r.message && (
                    <div className="p-2 bg-sand/20 border border-sand-border/60 rounded-sm text-xs text-charcoal italic">
                      "{r.message}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: ATTENDANCE STATS */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          {stats ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-ivory border border-sand-border rounded-sm text-center">
                  <p className="text-2xl font-serif font-bold text-forest">{stats.totalInvitedGuests}</p>
                  <p className="text-[10px] uppercase tracking-widest text-charcoal-muted mt-1">Invited Guests</p>
                </div>
                <div className="p-4 bg-ivory border border-sand-border rounded-sm text-center">
                  <p className="text-2xl font-serif font-bold text-forest">{stats.totalInvitedPeople}</p>
                  <p className="text-[10px] uppercase tracking-widest text-charcoal-muted mt-1">Total Invited People</p>
                </div>
                <div className="p-4 bg-ivory border border-sand-border rounded-sm text-center">
                  <p className="text-2xl font-serif font-bold text-emerald-700">{stats.confirmed}</p>
                  <p className="text-[10px] uppercase tracking-widest text-charcoal-muted mt-1">Confirmed RSVPs</p>
                </div>
                <div className="p-4 bg-ivory border border-sand-border rounded-sm text-center">
                  <p className="text-2xl font-serif font-bold text-emerald-700">{stats.totalConfirmedAttendees}</p>
                  <p className="text-[10px] uppercase tracking-widest text-charcoal-muted mt-1">Total Confirmed Attendees</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-ivory border border-sand-border rounded-sm text-center">
                  <p className="text-xl font-serif font-bold text-red-600">{stats.declined}</p>
                  <p className="text-[10px] uppercase tracking-widest text-charcoal-muted mt-1">Declined</p>
                </div>
                <div className="p-4 bg-ivory border border-sand-border rounded-sm text-center">
                  <p className="text-xl font-serif font-bold text-amber-600">{stats.tentative}</p>
                  <p className="text-[10px] uppercase tracking-widest text-charcoal-muted mt-1">Tentative</p>
                </div>
                <div className="p-4 bg-ivory border border-sand-border rounded-sm text-center">
                  <p className="text-xl font-serif font-bold text-gray-500">{stats.pending}</p>
                  <p className="text-[10px] uppercase tracking-widest text-charcoal-muted mt-1">Pending</p>
                </div>
              </div>

              {/* Family-Wise Breakdown */}
              <div className="p-5 bg-ivory border border-sand-border rounded-sm space-y-4">
                <h3 className="font-serif text-sm font-bold text-forest border-b border-sand-border/60 pb-2">
                  Family-Wise Attendance Breakdown
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-sand/20 border border-sand-border rounded-sm space-y-2">
                    <h4 className="text-xs uppercase tracking-widest text-forest font-bold">Groom's Side</h4>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-charcoal-muted">Invited Guests:</span>
                        <span className="ml-1 font-bold text-charcoal">{stats.familyWise.groom.invitedGuests}</span>
                      </div>
                      <div>
                        <span className="text-charcoal-muted">Invited People:</span>
                        <span className="ml-1 font-bold text-charcoal">{stats.familyWise.groom.invitedPeople}</span>
                      </div>
                      <div>
                        <span className="text-charcoal-muted">Confirmed RSVPs:</span>
                        <span className="ml-1 font-bold text-emerald-700">{stats.familyWise.groom.confirmedRsvps}</span>
                      </div>
                      <div>
                        <span className="text-charcoal-muted">Confirmed Attendees:</span>
                        <span className="ml-1 font-bold text-emerald-700">{stats.familyWise.groom.confirmedAttendees}</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-sand/20 border border-sand-border rounded-sm space-y-2">
                    <h4 className="text-xs uppercase tracking-widest text-forest font-bold">Bride's Side</h4>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-charcoal-muted">Invited Guests:</span>
                        <span className="ml-1 font-bold text-charcoal">{stats.familyWise.bride.invitedGuests}</span>
                      </div>
                      <div>
                        <span className="text-charcoal-muted">Invited People:</span>
                        <span className="ml-1 font-bold text-charcoal">{stats.familyWise.bride.invitedPeople}</span>
                      </div>
                      <div>
                        <span className="text-charcoal-muted">Confirmed RSVPs:</span>
                        <span className="ml-1 font-bold text-emerald-700">{stats.familyWise.bride.confirmedRsvps}</span>
                      </div>
                      <div>
                        <span className="text-charcoal-muted">Confirmed Attendees:</span>
                        <span className="ml-1 font-bold text-emerald-700">{stats.familyWise.bride.confirmedAttendees}</span>
                      </div>
                    </div>
                  </div>
                </div>
                {stats.familyWise.unlinked.confirmedRsvps > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-sm text-[11px] text-amber-800">
                    <span className="font-bold">Unlinked RSVPs:</span> {stats.familyWise.unlinked.confirmedRsvps} confirmed ({stats.familyWise.unlinked.confirmedAttendees} attendees) — these guests submitted RSVPs publicly but are not in your guest list.
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-xs text-charcoal-muted text-center py-8 italic">Loading attendance statistics...</p>
          )}
        </div>
      )}

      {/* TAB: EXPORT */}
      {activeTab === 'export' && (
        <div className="p-8 bg-ivory border border-sand-border rounded-sm text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-sand/30 border border-sand-border flex items-center justify-center">
            <FileSpreadsheet className="w-8 h-8 text-forest" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="font-serif text-xl text-forest font-bold">Export Guest Data</h3>
            <p className="text-xs text-charcoal-muted leading-relaxed">
              Download a CSV file containing all guest records, their RSVP status, attendance counts, dietary preferences, and messages. 
              The file is protected against formula injection for safe use in Excel and Google Sheets.
            </p>
          </div>
          <button
            onClick={handleExportCsv}
            className="px-6 py-3 bg-forest text-ivory text-xs uppercase tracking-widest font-semibold rounded-sm hover:bg-forest-light inline-flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Download CSV</span>
          </button>
          <p className="text-[10px] text-charcoal-muted">
            {guests.length} guests · {rsvps.length} RSVP responses
          </p>
        </div>
      )}
    </div>
  );
};
