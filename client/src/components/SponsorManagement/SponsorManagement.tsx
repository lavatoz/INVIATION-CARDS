import React, { useState, useEffect, useCallback } from 'react';
import { api, resolveMediaUrl } from '../../services/api';
import { WeddingSponsor } from '../../types';
import { BilingualInput } from '../BilingualInput';
import {
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
  ExternalLink,
  Phone,
  Mail,
  ArrowUp,
  ArrowDown,
  Upload,
  Image as ImageIcon,
  Award,
} from 'lucide-react';

interface SponsorManagementProps {
  invitationId: string;
}

const CATEGORIES = [
  'Photography',
  'Videography',
  'Catering',
  'Stage Decoration',
  'Makeup and Styling',
  'Wedding Planning',
  'Transportation',
  'Sound and Lighting',
  'Other Services',
];

const CUSTOM_CATEGORY_VALUE = '__CUSTOM__';

export const SponsorManagement: React.FC<SponsorManagementProps> = ({ invitationId }) => {
  const [sponsors, setSponsors] = useState<WeddingSponsor[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [customCategoryMode, setCustomCategoryMode] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form state for adding/editing a sponsor
  const [editingSponsor, setEditingSponsor] = useState<Partial<WeddingSponsor> | null>(null);

  const triggerFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const loadSponsors = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getSponsors(invitationId);
      if (res.success && res.data) {
        setSponsors(res.data.sponsors);
      }
    } catch (err: any) {
      triggerFeedback('error', err.message || 'Failed to load sponsors.');
    } finally {
      setIsLoading(false);
    }
  }, [invitationId]);

  useEffect(() => {
    loadSponsors();
  }, [loadSponsors]);

  // Handle Logo Upload via Base64 to disk storage
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Allowed types: PNG, JPG, JPEG, WebP
    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/webp'];
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!allowedMimeTypes.includes(file.type) && !allowedExtensions.includes(fileExt)) {
      triggerFeedback('error', 'Unsupported file type. Please upload a PNG, JPG, JPEG, or WebP image.');
      e.target.value = '';
      return;
    }

    const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE_BYTES) {
      triggerFeedback('error', 'File size exceeds 5MB limit. Please choose a smaller image.');
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const fileData = reader.result as string;
        const res = await api.uploadSponsorLogo(invitationId, {
          fileName: file.name,
          fileData,
        });
        if (res.success && res.data?.url) {
          setEditingSponsor((prev) => ({
            ...prev,
            logoUrl: res.data.url,
          }));
          triggerFeedback('success', 'Logo uploaded successfully.');
        }
      } catch (err: any) {
        triggerFeedback('error', err.message || 'Failed to upload logo.');
      } finally {
        setIsUploading(false);
        e.target.value = '';
      }
    };
    reader.onerror = () => {
      triggerFeedback('error', 'Error reading image file.');
      setIsUploading(false);
      e.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  // Save (Add or Update)
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedCategory = editingSponsor?.category?.trim() || '';
    if (!editingSponsor?.nameEn?.trim() || !trimmedCategory) {
      triggerFeedback('error', 'Company name and category are required.');
      return;
    }

    const payload = { ...editingSponsor, category: trimmedCategory };

    setIsSaving(true);
    try {
      if (editingSponsor.id) {
        const res = await api.updateSponsor(invitationId, editingSponsor.id, payload);
        if (res.success) {
          triggerFeedback('success', 'Sponsor updated successfully.');
          setEditingSponsor(null);
          setCustomCategoryMode(false);
          loadSponsors();
        }
      } else {
        const res = await api.addSponsor(invitationId, payload);
        if (res.success) {
          triggerFeedback('success', 'Sponsor added successfully.');
          setEditingSponsor(null);
          setCustomCategoryMode(false);
          loadSponsors();
        }
      }
    } catch (err: any) {
      triggerFeedback('error', err.message || 'Failed to save sponsor.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete
  const handleDelete = async (sponsorId: string) => {
    if (!window.confirm('Are you sure you want to delete this wedding partner?')) return;
    try {
      const res = await api.deleteSponsor(invitationId, sponsorId);
      if (res.success) {
        triggerFeedback('success', 'Sponsor removed.');
        setSponsors((prev) => prev.filter((s) => s.id !== sponsorId));
      }
    } catch (err: any) {
      triggerFeedback('error', err.message || 'Failed to delete sponsor.');
    }
  };

  // Toggle active
  const handleToggleActive = async (sponsor: WeddingSponsor) => {
    try {
      const res = await api.updateSponsor(invitationId, sponsor.id, {
        isActive: !sponsor.isActive,
      });
      if (res.success) {
        setSponsors((prev) =>
          prev.map((s) => (s.id === sponsor.id ? { ...s, isActive: !s.isActive } : s))
        );
        triggerFeedback('success', `Sponsor ${sponsor.isActive ? 'hidden' : 'activated'}.`);
      }
    } catch (err: any) {
      triggerFeedback('error', err.message || 'Failed to update sponsor status.');
    }
  };

  // Move Up / Down
  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sponsors.length) return;

    const newSponsors = [...sponsors];
    const temp = newSponsors[index];
    newSponsors[index] = newSponsors[targetIndex];
    newSponsors[targetIndex] = temp;

    // Assign new sortOrders
    const items = newSponsors.map((s, idx) => ({ id: s.id, sortOrder: idx }));
    setSponsors(newSponsors);

    try {
      await api.reorderSponsors(invitationId, items);
      triggerFeedback('success', 'Sponsor order updated.');
    } catch (err: any) {
      triggerFeedback('error', err.message || 'Failed to update order.');
      loadSponsors();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-sand-border/70 pb-3 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-serif text-forest flex items-center space-x-2">
            <Award className="w-5 h-5" />
            <span>Wedding Sponsors & Partners</span>
          </h2>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Manage vendors, photographers, caterers, and partners highlighted on your public wedding website.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={loadSponsors}
            disabled={isLoading}
            className="p-2 bg-sand/30 hover:bg-sand/60 border border-sand-border text-charcoal rounded-sm transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => {
              setCustomCategoryMode(false);
              setEditingSponsor({
                nameEn: '',
                nameMl: '',
                category: CATEGORIES[0],
                descriptionEn: '',
                descriptionMl: '',
                websiteUrl: '',
                contactPhone: '',
                contactEmail: '',
                socialLinks: '',
                discountOfferEn: '',
                discountOfferMl: '',
                isActive: true,
              });
            }}
            className="px-4 py-2 bg-forest text-ivory text-xs uppercase tracking-widest font-semibold rounded-sm hover:bg-forest-light flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Partner</span>
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

      {/* Editor Modal / Inline Drawer */}
      {editingSponsor && (
        <form onSubmit={handleSave} className="p-6 bg-sand/20 border border-sand-border rounded-sm space-y-5">
          <div className="flex justify-between items-center border-b border-sand-border/70 pb-2">
            <h3 className="font-serif font-bold text-forest text-base">
              {editingSponsor.id ? 'Edit Wedding Partner' : 'New Wedding Partner'}
            </h3>
            <button
              type="button"
              onClick={() => setEditingSponsor(null)}
              className="text-xs text-charcoal-muted hover:text-charcoal"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BilingualInput
              label="Company / Partner Name"
              englishValue={editingSponsor.nameEn || ''}
              malayalamValue={editingSponsor.nameMl || ''}
              onEnglishChange={(v) => setEditingSponsor((prev) => ({ ...prev, nameEn: v }))}
              onMalayalamChange={(v) => setEditingSponsor((prev) => ({ ...prev, nameMl: v }))}
              required
            />

            <div>
              <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1.5">
                Service Category *
              </label>
              <select
                value={
                  customCategoryMode || (editingSponsor.category && !CATEGORIES.includes(editingSponsor.category))
                    ? CUSTOM_CATEGORY_VALUE
                    : editingSponsor.category || CATEGORIES[0]
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === CUSTOM_CATEGORY_VALUE) {
                    setCustomCategoryMode(true);
                    setEditingSponsor((prev) => ({
                      ...prev,
                      category: prev?.category && !CATEGORIES.includes(prev.category) ? prev.category : '',
                    }));
                  } else {
                    setCustomCategoryMode(false);
                    setEditingSponsor((prev) => ({ ...prev, category: val }));
                  }
                }}
                className="w-full px-3 py-2 bg-ivory border border-sand-border rounded-sm text-xs text-charcoal focus:outline-none focus:border-forest"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value={CUSTOM_CATEGORY_VALUE}>Custom</option>
              </select>
              {(customCategoryMode || (editingSponsor.category !== undefined && editingSponsor.category !== null && !CATEGORIES.includes(editingSponsor.category))) && (
                <input
                  type="text"
                  value={editingSponsor.category || ''}
                  onChange={(e) => setEditingSponsor((prev) => ({ ...prev, category: e.target.value }))}
                  placeholder="Enter custom category (e.g. Florist, Mehndi Artist, Jewelry)"
                  className="mt-2 w-full px-3 py-2 bg-ivory border border-sand-border rounded-sm text-xs text-charcoal focus:outline-none focus:border-forest"
                  required
                  autoFocus
                />
              )}
            </div>
          </div>

          {/* Logo Upload Section */}
          <div className="p-4 bg-ivory border border-sand-border rounded-sm space-y-3">
            <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold">
              Partner Logo (Local Disk Storage)
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {editingSponsor.logoUrl ? (
                <div className="w-20 h-20 rounded border border-sand bg-ivory-surface flex items-center justify-center overflow-hidden p-1 relative">
                  <img
                    src={resolveMediaUrl(editingSponsor.logoUrl)}
                    alt="Logo preview"
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="w-20 h-20 rounded border border-dashed border-sand-border bg-sand/20 flex flex-col items-center justify-center text-charcoal-muted">
                  <ImageIcon className="w-6 h-6 mb-1 text-charcoal-muted" />
                  <span className="text-[9px] uppercase font-mono">No Logo</span>
                </div>
              )}

              <div className="flex-1 space-y-2">
                <div className="flex items-center space-x-2">
                  <label className="cursor-pointer px-4 py-2 bg-sand/40 hover:bg-sand border border-sand-border text-charcoal text-xs uppercase tracking-wider font-semibold rounded-sm inline-flex items-center space-x-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploading ? 'Uploading...' : 'Upload Logo File'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                      onChange={handleLogoUpload}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>
                  {editingSponsor.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setEditingSponsor((prev) => ({ ...prev, logoUrl: null }))}
                      className="px-3 py-2 text-xs text-red-700 hover:underline"
                    >
                      Remove Logo
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-charcoal-muted">
                  Supported formats: PNG, JPG, JPEG, WebP (max 5MB). Saved safely to server local disk storage.
                </p>
              </div>
            </div>
          </div>

          <BilingualInput
            label="Short Description / Tagline"
            englishValue={editingSponsor.descriptionEn || ''}
            malayalamValue={editingSponsor.descriptionMl || ''}
            onEnglishChange={(v) => setEditingSponsor((prev) => ({ ...prev, descriptionEn: v }))}
            onMalayalamChange={(v) => setEditingSponsor((prev) => ({ ...prev, descriptionMl: v }))}
            isTextarea
            rows={2}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1.5">
                Website URL
              </label>
              <input
                type="url"
                value={editingSponsor.websiteUrl || ''}
                onChange={(e) => setEditingSponsor((prev) => ({ ...prev, websiteUrl: e.target.value }))}
                placeholder="https://vendor.com"
                className="w-full px-3 py-2 bg-ivory border border-sand-border rounded-sm text-xs font-mono text-charcoal"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1.5">
                Contact Phone
              </label>
              <input
                type="tel"
                value={editingSponsor.contactPhone || ''}
                onChange={(e) => setEditingSponsor((prev) => ({ ...prev, contactPhone: e.target.value }))}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 bg-ivory border border-sand-border rounded-sm text-xs text-charcoal"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1.5">
                Contact Email
              </label>
              <input
                type="email"
                value={editingSponsor.contactEmail || ''}
                onChange={(e) => setEditingSponsor((prev) => ({ ...prev, contactEmail: e.target.value }))}
                placeholder="hello@vendor.com"
                className="w-full px-3 py-2 bg-ivory border border-sand-border rounded-sm text-xs text-charcoal"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-charcoal font-semibold mb-1.5">
                Social Media Links (e.g. Instagram Handle or URL)
              </label>
              <input
                type="text"
                value={editingSponsor.socialLinks || ''}
                onChange={(e) => setEditingSponsor((prev) => ({ ...prev, socialLinks: e.target.value }))}
                placeholder="@vendor_creatives or https://instagram.com/..."
                className="w-full px-3 py-2 bg-ivory border border-sand-border rounded-sm text-xs text-charcoal"
              />
            </div>

            <div className="flex items-center space-x-3 pt-6">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingSponsor.isActive ?? true}
                  onChange={(e) => setEditingSponsor((prev) => ({ ...prev, isActive: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-sand-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-ivory after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-ivory after:border-sand after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-forest"></div>
              </label>
              <span className="text-xs uppercase tracking-wider font-semibold text-charcoal">
                {editingSponsor.isActive ? 'Active (Visible publicly)' : 'Inactive (Hidden)'}
              </span>
            </div>
          </div>

          <BilingualInput
            label="Special Offer / Guest Discount (Optional)"
            englishValue={editingSponsor.discountOfferEn || ''}
            malayalamValue={editingSponsor.discountOfferMl || ''}
            onEnglishChange={(v) => setEditingSponsor((prev) => ({ ...prev, discountOfferEn: v }))}
            onMalayalamChange={(v) => setEditingSponsor((prev) => ({ ...prev, discountOfferMl: v }))}
            englishPlaceholder="e.g. 15% discount for wedding guests using code KERALA2026"
            malayalamPlaceholder="ഉദാ: അതിഥികൾക്കായി 15% പ്രത്യേക ഇളവ്"
          />

          <div className="flex justify-end space-x-2 pt-2 border-t border-sand-border/60">
            <button
              type="button"
              onClick={() => setEditingSponsor(null)}
              className="px-4 py-2 border border-sand-border text-xs uppercase tracking-wider rounded-sm text-charcoal-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-forest text-ivory text-xs uppercase tracking-widest font-semibold rounded-sm hover:bg-forest-light flex items-center space-x-1"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Partner'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Sponsors List */}
      <div className="space-y-3">
        {sponsors.length === 0 ? (
          <div className="p-8 bg-ivory border border-sand-border rounded-sm text-center space-y-2">
            <Award className="w-8 h-8 text-charcoal-muted mx-auto" />
            <p className="text-xs text-charcoal-muted italic">
              No wedding partners or sponsors added yet. Click "+ Add Partner" above to showcase photography, catering, styling, and decor partners.
            </p>
          </div>
        ) : (
          sponsors.map((s, index) => (
            <div
              key={s.id}
              className={`p-4 bg-ivory border rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                s.isActive ? 'border-sand-border shadow-sm' : 'border-dashed border-sand-border/70 opacity-70'
              }`}
            >
              <div className="flex items-start space-x-4 flex-1">
                {s.logoUrl ? (
                  <div className="w-14 h-14 rounded border border-sand-border bg-ivory-surface flex items-center justify-center p-1 flex-shrink-0 relative">
                    <img
                      src={resolveMediaUrl(s.logoUrl)}
                      alt={s.nameEn}
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        const img = e.currentTarget;
                        img.style.display = 'none';
                        const parent = img.parentElement;
                        if (parent && !parent.querySelector('.fallback-initial')) {
                          const fb = document.createElement('div');
                          fb.className = 'w-full h-full flex items-center justify-center text-forest font-serif font-bold text-lg fallback-initial bg-sand/30';
                          fb.innerText = s.nameEn.charAt(0);
                          parent.appendChild(fb);
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded bg-sand/30 border border-sand-border flex items-center justify-center text-forest font-serif font-bold text-lg flex-shrink-0">
                    {s.nameEn.charAt(0)}
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex items-center space-x-2 flex-wrap">
                    <span className="font-bold text-sm text-charcoal font-serif">{s.nameEn}</span>
                    {s.nameMl && (
                      <span className="text-xs text-forest font-malayalam">({s.nameMl})</span>
                    )}
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-sand/40 border border-sand-border rounded text-charcoal-muted font-semibold">
                      {s.category || s.sponsorType}
                    </span>
                    <span
                      className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded font-semibold ${
                        s.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {s.isActive ? 'Active' : 'Hidden'}
                    </span>
                  </div>

                  {s.descriptionEn && (
                    <p className="text-xs text-charcoal-muted line-clamp-1">{s.descriptionEn}</p>
                  )}

                  {s.discountOfferEn && (
                    <p className="text-[11px] text-forest font-medium">✦ Offer: {s.discountOfferEn}</p>
                  )}

                  <div className="flex items-center space-x-3 text-[11px] text-charcoal-muted pt-1">
                    {s.websiteUrl && (
                      <a
                        href={s.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 hover:text-forest"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Website</span>
                      </a>
                    )}
                    {s.contactPhone && (
                      <span className="inline-flex items-center space-x-1">
                        <Phone className="w-3 h-3" />
                        <span>{s.contactPhone}</span>
                      </span>
                    )}
                    {s.contactEmail && (
                      <span className="inline-flex items-center space-x-1">
                        <Mail className="w-3 h-3" />
                        <span>{s.contactEmail}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons & Reorder */}
              <div className="flex items-center space-x-1 self-end sm:self-center">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => handleMoveOrder(index, 'up')}
                  className="p-1.5 text-charcoal-muted hover:text-forest disabled:opacity-30"
                  title="Move Up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={index === sponsors.length - 1}
                  onClick={() => handleMoveOrder(index, 'down')}
                  className="p-1.5 text-charcoal-muted hover:text-forest disabled:opacity-30"
                  title="Move Down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleActive(s)}
                  className="px-2.5 py-1 text-[11px] border border-sand-border text-charcoal hover:bg-sand/30 rounded"
                >
                  {s.isActive ? 'Hide' : 'Show'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const isCustom = Boolean(s.category && !CATEGORIES.includes(s.category));
                    setCustomCategoryMode(isCustom);
                    setEditingSponsor(s);
                  }}
                  className="p-1.5 text-charcoal-muted hover:text-forest"
                  title="Edit"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(s.id)}
                  className="p-1.5 text-charcoal-muted hover:text-red-700"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
