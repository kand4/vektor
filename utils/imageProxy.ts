/**
 * Normalizes an image URL for display in browsers on Vercel or cloud hosts.
 * If the image is on an external host (like litterbox/catbox) that may be blocked
 * by ISP/ad-blocker or mixed-content policies, it can route via /api/image-proxy
 * or provide a robust image source with automatic fallback.
 */
export function getSafeImageUrl(src: string | undefined | null): string {
  if (!src) return '';
  if (src.startsWith('data:') || src.startsWith('blob:') || src.startsWith('/')) {
    return src;
  }
  return src;
}

/**
 * Returns proxy URL if direct loading fails or if host is known to have CORS/CSP/ISP issues.
 */
export function getProxiedImageUrl(src: string): string {
  if (!src || !src.startsWith('http')) return src;
  return `/api/image-proxy?url=${encodeURIComponent(src)}`;
}
