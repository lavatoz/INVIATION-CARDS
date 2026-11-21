/**
 * Utility functions for generating public wedding invitation URLs,
 * copying them to clipboard, and triggering native Web Share.
 */

/**
 * Returns the full public URL for a given wedding invitation slug.
 * Dynamically uses the current browser origin (or configured env)
 * so it never hardcodes localhost in production.
 */
export const getPublicInvitationUrl = (slug: string): string => {
  const origin =
    (typeof window !== 'undefined' && window.location ? window.location.origin : '') ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_PUBLIC_URL) ||
    '';
  return `${origin.replace(/\/$/, '')}/invitation/${encodeURIComponent(slug)}`;
};

/**
 * Copies the public invitation link to clipboard.
 * Uses modern navigator.clipboard with a fallback for older environments.
 */
export const copyInvitationLink = async (
  slug: string
): Promise<{ success: boolean; message: string; url: string }> => {
  const url = getPublicInvitationUrl(slug);

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(url);
      return {
        success: true,
        message: 'Invitation link copied successfully!',
        url,
      };
    } else {
      // Fallback for non-secure contexts or legacy browsers
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.left = '-999999px';
      textarea.style.top = '-999999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);

      if (successful) {
        return {
          success: true,
          message: 'Invitation link copied successfully!',
          url,
        };
      }
      throw new Error('Clipboard copy command was unsuccessful');
    }
  } catch (err: any) {
    console.error('Copy link error:', err);
    return {
      success: false,
      message: 'Could not copy automatically. Link: ' + url,
      url,
    };
  }
};

/**
 * Shares the public wedding invitation using the browser's native Web Share API
 * on supported devices (e.g. mobile Safari, Chrome Android).
 * Falls back to clipboard copy if Web Share is not available or rejected.
 */
export const shareInvitation = async (
  title: string,
  slug: string
): Promise<{ success: boolean; message: string; shared: boolean; url: string }> => {
  const url = getPublicInvitationUrl(slug);
  const shareTitle = title ? title.trim() : 'Wedding Invitation';
  const shareText =
    'You are warmly invited to celebrate our special day. Open the invitation for details.';

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: shareTitle,
        text: shareText,
        url: url,
      });

      // Native share sheet was opened and completed
      return {
        success: true,
        shared: true,
        message: 'Share sheet opened.',
        url,
      };
    } catch (err: any) {
      // If user dismissed the share dialog, do not show an error
      if (err.name === 'AbortError') {
        return {
          success: true,
          shared: false,
          message: '',
          url,
        };
      }

      // If native sharing failed for any other reason, fall back to copy
      const copyResult = await copyInvitationLink(slug);
      return {
        success: copyResult.success,
        shared: false,
        message:
          'Sharing was not completed. Invitation link copied to clipboard instead!',
        url,
      };
    }
  } else {
    // Native Web Share API is not supported on this desktop/browser
    const copyResult = await copyInvitationLink(slug);
    return {
      success: copyResult.success,
      shared: false,
      message:
        'Sharing is not supported on this device. Invitation link copied to clipboard instead!',
      url,
    };
  }
};
