import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api, resolveMediaUrl } from '../../services/api';
import { PublicMediaItem } from '../../types';
import { BilingualInput } from '../BilingualInput';
import {
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  Camera,
  Eye,
  X,
  ArrowUp,
  ArrowDown,
  Repeat,
} from 'lucide-react';

interface GalleryManagementProps {
  invitationId: string;
}

interface PhotoEditState {
  id?: string;
  captionEn: string;
  captionMl: string;
  previewUrl?: string;
  fileData?: string;
  fileName?: string;
  isReplacing?: boolean;
}

export const GalleryManagement: React.FC<GalleryManagementProps> = ({ invitationId }) => {
  const [mediaList, setMediaList] = useState<PublicMediaItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form state for adding/editing a photo
  const [editingPhoto, setEditingPhoto] = useState<PhotoEditState | null>(null);

  // Batch upload state
  const [batchQueue, setBatchQueue] = useState<Array<{ fileName: string; fileData: string; previewUrl: string }>>([]);

  // Lightbox preview for full photo
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  const triggerFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const loadMedia = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getOwnerMedia(invitationId);
      if (res.success && res.data) {
        setMediaList(res.data.media);
      }
    } catch (err: any) {
      console.error('Failed to load gallery photos:', err);
      triggerFeedback('error', 'Failed to load gallery photos.');
    } finally {
      setIsLoading(false);
    }
  }, [invitationId]);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  // Handle multiple file selection for Add Photos
  const handleMultipleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
    const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!allowedMimeTypes.includes(file.type) && !allowedExtensions.includes(fileExt)) {
        triggerFeedback('error', `Skipped "${file.name}": unsupported format. Only PNG, JPG, WEBP allowed.`);
        continue;
      }
      if (file.size > MAX_SIZE_BYTES) {
        triggerFeedback('error', `Skipped "${file.name}": exceeds 10MB limit.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    let readCount = 0;
    const newItems: Array<{ fileName: string; fileData: string; previewUrl: string }> = [];

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        newItems.push({
          fileName: file.name,
          fileData: result,
          previewUrl: result,
        });
        readCount++;
        if (readCount === validFiles.length) {
          if (validFiles.length === 1 && !batchQueue.length) {
            // Single file selected: open regular editor
            setEditingPhoto({
              captionEn: '',
              captionMl: '',
              fileName: newItems[0].fileName,
              fileData: newItems[0].fileData,
              previewUrl: newItems[0].previewUrl,
            });
          } else {
            // Multiple files: add to batch queue
            setBatchQueue((prev) => [...prev, ...newItems]);
          }
          setIsUploading(false);
          e.target.value = '';
          triggerFeedback('success', `${validFiles.length} photo(s) selected and ready.`);
        }
      };
      reader.onerror = () => {
        readCount++;
        if (readCount === validFiles.length) {
          setIsUploading(false);
          e.target.value = '';
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Upload entire batch queue
  const handleSaveBatch = async () => {
    if (batchQueue.length === 0) return;
    setIsSaving(true);
    try {
      const payload = {
        photos: batchQueue.map((item) => ({
          fileName: item.fileName,
          fileData: item.fileData,
        })),
      };
      const res = await api.uploadGalleryPhoto(invitationId, payload);
      if (res.success) {
        triggerFeedback('success', `${batchQueue.length} photos uploaded to gallery.`);
        setBatchQueue([]);
        loadMedia();
      }
    } catch (err: any) {
      triggerFeedback('error', err.message || 'Failed to upload batch photos.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle single photo replacement file selection
  const handleReplaceFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!allowedMimeTypes.includes(file.type) && !allowedExtensions.includes(fileExt)) {
      triggerFeedback('error', 'Unsupported file type. Please upload a PNG, JPG, JPEG, or WebP image.');
      e.target.value = '';
      return;
    }

    const MAX_SIZE_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      triggerFeedback('error', 'File size exceeds 10MB limit.');
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setEditingPhoto((prev) =>
        prev
          ? {
              ...prev,
              fileData: result,
              fileName: file.name,
              previewUrl: result,
              isReplacing: true,
            }
          : null
      );
      setIsUploading(false);
      e.target.value = '';
      triggerFeedback('success', 'New image chosen for replacement. Click Save Changes.');
    };
    reader.onerror = () => {
      triggerFeedback('error', 'Error reading image file.');
      setIsUploading(false);
      e.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  // Save (Upload New, Replace Image, or Update Metadata)
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingPhoto) return;

    setIsSaving(true);
    try {
      if (editingPhoto.id) {
        if (editingPhoto.isReplacing && editingPhoto.fileData && editingPhoto.fileName) {
          // Replace image file and update metadata
          const res = await api.replaceMediaPhoto(invitationId, editingPhoto.id, {
            fileName: editingPhoto.fileName,
            fileData: editingPhoto.fileData,
            captionEn: editingPhoto.captionEn || undefined,
            captionMl: editingPhoto.captionMl || undefined,
          });
          if (res.success) {
            triggerFeedback('success', 'Photograph replaced successfully.');
            setEditingPhoto(null);
            loadMedia();
          }
        } else {
          // Update caption / description metadata only
          const res = await api.updateMedia(invitationId, editingPhoto.id, {
            captionEn: editingPhoto.captionEn || null,
            captionMl: editingPhoto.captionMl || null,
          });
          if (res.success) {
            triggerFeedback('success', 'Photo details updated successfully.');
            setEditingPhoto(null);
            loadMedia();
          }
        }
      } else {
        // Upload new photo
        if (!editingPhoto.fileData) {
          triggerFeedback('error', 'Please choose an image file to upload.');
          return;
        }
        const res = await api.uploadGalleryPhoto(invitationId, {
          fileName: editingPhoto.fileName || 'photo.jpg',
          fileData: editingPhoto.fileData,
          captionEn: editingPhoto.captionEn,
          captionMl: editingPhoto.captionMl,
        });
        if (res.success) {
          triggerFeedback('success', 'Photo added to gallery successfully.');
          setEditingPhoto(null);
          loadMedia();
        }
      }
    } catch (err: any) {
      triggerFeedback('error', err.message || 'Failed to save photo.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete photo
  const handleDelete = async (mediaId: string) => {
    if (!window.confirm('Are you sure you want to delete this photograph from the gallery?')) return;
    try {
      const res = await api.deleteMedia(invitationId, mediaId);
      if (res.success) {
        triggerFeedback('success', 'Photo removed.');
        setMediaList((prev) => prev.filter((m) => m.id !== mediaId));
      }
    } catch (err: any) {
      triggerFeedback('error', err.message || 'Failed to delete photo.');
    }
  };

  // Move photo up/down to change display order
  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= mediaList.length) return;

    const updated = [...mediaList];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    // Reassign sort orders
    const items = updated.map((item, idx) => ({
      id: item.id,
      sortOrder: idx,
    }));

    setMediaList(updated);

    try {
      await api.reorderMedia(invitationId, items);
      triggerFeedback('success', 'Display order updated.');
    } catch (err: any) {
      triggerFeedback('error', 'Failed to save new display order.');
      loadMedia(); // Revert
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-ivory border border-sand-border rounded-sm p-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-forest" />
            <h2 className="text-xl font-serif text-forest font-bold">Moments & Photographs Gallery</h2>
          </div>
          <p className="text-xs text-charcoal-muted mt-1 leading-relaxed max-w-2xl">
            Upload multiple photos, rearrange display order, replace images, and edit captions.
            Public guests see compact horizontal detail cards with lightbox view on click.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/png, image/jpeg, image/jpg, image/webp"
            onChange={handleMultipleFileSelect}
            className="hidden"
            disabled={isUploading}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-4 py-2 bg-forest text-ivory text-xs uppercase tracking-widest font-semibold rounded-sm hover:bg-forest-light flex items-center justify-center space-x-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{isUploading ? 'Reading Files...' : 'Add Photos'}</span>
          </button>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-sm border text-xs font-mono flex items-center space-x-2.5 transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Batch Upload Confirmation Queue */}
      {batchQueue.length > 0 && (
        <div className="p-5 bg-sand/20 border border-sand-border rounded-sm space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif font-bold text-base text-forest">
                Ready to Upload ({batchQueue.length} Photos)
              </h3>
              <p className="text-xs text-charcoal-muted">
                Review your selected photos before adding them to your gallery.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setBatchQueue([])}
                className="px-3 py-1.5 text-xs font-mono uppercase text-charcoal-muted hover:text-charcoal"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleSaveBatch}
                disabled={isSaving}
                className="px-4 py-1.5 bg-forest text-ivory text-xs uppercase tracking-widest font-semibold rounded-sm hover:bg-forest-light flex items-center space-x-1 shadow-sm"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Upload All</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {batchQueue.map((item, idx) => (
              <div
                key={idx}
                className="relative aspect-square rounded border border-sand-border bg-ivory overflow-hidden group p-1 flex items-center justify-center"
              >
                <img src={item.previewUrl} alt={item.fileName} className="max-w-full max-h-full object-contain" />
                <button
                  type="button"
                  onClick={() => setBatchQueue((prev) => prev.filter((_, i) => i !== idx))}
                  className="absolute top-1 right-1 p-1 bg-charcoal/70 text-ivory rounded-full hover:bg-rose-600 transition-colors"
                  title="Remove from queue"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Single Add / Edit / Replace Form */}
      {editingPhoto && (
        <form
          onSubmit={handleSave}
          className="bg-ivory border-2 border-forest/30 rounded-sm p-6 space-y-6 shadow-md transition-all animate-fadeIn"
        >
          <div className="flex items-center justify-between border-b border-sand-border pb-3">
            <h3 className="font-serif font-bold text-lg text-forest flex items-center space-x-2">
              <Camera className="w-5 h-5" />
              <span>
                {editingPhoto.id
                  ? editingPhoto.isReplacing
                    ? 'Replace Photo Image'
                    : 'Edit Photo Details'
                  : 'Add New Photograph'}
              </span>
            </h3>
            <button
              type="button"
              onClick={() => setEditingPhoto(null)}
              className="text-xs font-mono text-charcoal-muted hover:text-charcoal"
            >
              Cancel
            </button>
          </div>

          {/* Photo File Preview and Replace Action */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal">
              Photo Thumbnail <span className="text-rose-500">*</span>
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {editingPhoto.previewUrl ? (
                <div className="w-[90px] h-[90px] rounded border border-sand-border bg-ivory-surface flex items-center justify-center overflow-hidden p-1 relative flex-shrink-0">
                  <img
                    src={editingPhoto.previewUrl}
                    alt="Preview"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-[90px] h-[90px] rounded border-2 border-dashed border-sand-border bg-sand/20 flex flex-col items-center justify-center text-charcoal-muted flex-shrink-0">
                  <ImageIcon className="w-8 h-8 opacity-40" />
                  <span className="text-[10px] mt-1">No Image</span>
                </div>
              )}

              <div className="flex-1 w-full space-y-2">
                <input
                  ref={replaceFileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={editingPhoto.id ? handleReplaceFileSelect : handleMultipleFileSelect}
                  className="hidden"
                  disabled={isUploading}
                />

                <button
                  type="button"
                  onClick={() => replaceFileInputRef.current?.click()}
                  className="inline-flex items-center space-x-2 px-4 py-2 border border-forest/40 bg-sand/20 hover:bg-sand/40 text-forest text-xs font-semibold rounded cursor-pointer transition-colors"
                >
                  {editingPhoto.id ? <Repeat className="w-3.5 h-3.5" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>
                    {isUploading
                      ? 'Processing...'
                      : editingPhoto.id
                      ? 'Replace with Another Image'
                      : 'Choose Image File'}
                  </span>
                </button>
                <p className="text-[11px] text-charcoal-muted">
                  Supports PNG, JPG, JPEG, and WebP up to 10MB.
                </p>
              </div>
            </div>
          </div>

          {/* Title & Description Bilingual Inputs */}
          <div className="space-y-4">
            <BilingualInput
              label="Photo Title & Caption"
              englishValue={editingPhoto.captionEn}
              malayalamValue={editingPhoto.captionMl}
              onEnglishChange={(val: string) =>
                setEditingPhoto((prev) => (prev ? { ...prev, captionEn: val } : null))
              }
              onMalayalamChange={(val: string) =>
                setEditingPhoto((prev) => (prev ? { ...prev, captionMl: val } : null))
              }
              englishPlaceholder="e.g. Engagement - Exchange of rings and family blessings"
              malayalamPlaceholder="ഉദാ: മോതിരം മാറലും കുടുംബത്തോടൊപ്പമുള്ള മനോഹര നിമിഷങ്ങളും"
              description="Enter a title and optional short description. Public invitation cards display this alongside the thumbnail."
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-sand-border">
            <button
              type="button"
              onClick={() => setEditingPhoto(null)}
              className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-charcoal-muted hover:text-charcoal"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="px-5 py-2 bg-forest text-ivory text-xs uppercase tracking-widest font-semibold rounded-sm hover:bg-forest-light flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Uploaded Photographs List (Thumbnail Cards) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif font-bold text-base text-charcoal">
            Uploaded Photographs ({mediaList.length})
          </h3>
          <button
            onClick={loadMedia}
            className="text-xs font-mono text-forest flex items-center space-x-1 hover:underline"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh</span>
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center bg-ivory border border-sand-border rounded-sm">
            <RefreshCw className="w-6 h-6 text-forest animate-spin mx-auto mb-2" />
            <p className="text-xs text-charcoal-muted">Loading photographs...</p>
          </div>
        ) : mediaList.length === 0 ? (
          <div className="p-10 text-center bg-ivory border border-dashed border-sand-border rounded-sm space-y-3">
            <ImageIcon className="w-10 h-10 text-charcoal-muted mx-auto opacity-50" />
            <h4 className="font-serif text-base text-forest">No Photographs in Gallery Yet</h4>
            <p className="text-xs text-charcoal-muted max-w-md mx-auto">
              Add photographs of your engagement, pre-wedding shoot, ceremony, and special moments.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-forest text-ivory text-xs uppercase tracking-widest font-semibold rounded-sm hover:bg-forest-light inline-flex items-center space-x-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Photos</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mediaList.map((item, idx) => (
              <div
                key={item.id}
                className="bg-ivory border border-sand-border rounded-sm p-3.5 flex items-center space-x-3.5 shadow-sm hover:border-forest/40 transition-all"
              >
                {/* 90x90 Thumbnail with Lightbox click */}
                <div
                  onClick={() => setPreviewModalUrl(resolveMediaUrl(item.url))}
                  className="w-[90px] h-[90px] min-w-[90px] min-h-[90px] rounded-sm bg-sand/20 border border-sand-border flex items-center justify-center p-1 overflow-hidden cursor-pointer relative group flex-shrink-0"
                  title="Click to view full photo"
                >
                  <img
                    src={resolveMediaUrl(item.url)}
                    alt={item.captionEn || `Moment ${idx + 1}`}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-forest/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Eye className="w-4 h-4 text-ivory" />
                  </div>
                </div>

                {/* Details & Actions */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="font-serif font-bold text-sm text-forest truncate">
                      {item.captionEn || `Moment ${idx + 1}`}
                    </h4>
                    <span className="text-[10px] font-mono text-charcoal-muted uppercase bg-sand/30 px-1.5 py-0.5 rounded">
                      #{idx + 1}
                    </span>
                  </div>

                  {item.captionMl && (
                    <p className="text-xs font-malayalam text-forest/80 truncate">
                      {item.captionMl}
                    </p>
                  )}

                  <p className="text-[11px] font-mono text-charcoal-muted truncate">
                    {item.fileName}
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    {/* Reorder Buttons */}
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveOrder(idx, 'up')}
                        className="p-1 text-charcoal-muted hover:text-forest disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-sand/30"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === mediaList.length - 1}
                        onClick={() => handleMoveOrder(idx, 'down')}
                        className="p-1 text-charcoal-muted hover:text-forest disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-sand/30"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Edit, Replace & Delete */}
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setEditingPhoto({
                            id: item.id,
                            captionEn: item.captionEn || '',
                            captionMl: item.captionMl || '',
                            previewUrl: resolveMediaUrl(item.url),
                            isReplacing: true,
                          })
                        }
                        className="p-1 text-charcoal-muted hover:text-forest transition-colors rounded hover:bg-sand/30"
                        title="Replace photograph"
                      >
                        <Repeat className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setEditingPhoto({
                            id: item.id,
                            captionEn: item.captionEn || '',
                            captionMl: item.captionMl || '',
                            previewUrl: resolveMediaUrl(item.url),
                          })
                        }
                        className="p-1 text-charcoal-muted hover:text-forest transition-colors rounded hover:bg-sand/30"
                        title="Edit photo details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-1 text-charcoal-muted hover:text-rose-600 transition-colors rounded hover:bg-rose-50"
                        title="Delete photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Owner Full Photo Preview Lightbox */}
      {previewModalUrl && (
        <div className="fixed inset-0 z-50 bg-charcoal/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-[90vh] bg-ivory rounded-sm border border-sand p-2 shadow-2xl flex flex-col items-center">
            <button
              onClick={() => setPreviewModalUrl(null)}
              className="absolute -top-10 right-0 text-ivory hover:text-sand text-xs uppercase tracking-widest flex items-center space-x-1"
            >
              <X className="w-5 h-5" />
              <span>Close</span>
            </button>
            <img
              src={previewModalUrl}
              alt="Full Preview"
              className="max-h-[80vh] w-auto object-contain rounded-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
};
