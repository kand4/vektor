/**
 * Returns proxy URL if direct loading fails or if host is known to have CORS/CSP/ISP issues.
 */
export function getProxiedImageUrl(src: string): string {
  if (!src || !src.startsWith('http')) return src;
  return `/api/image-proxy?url=${encodeURIComponent(src)}`;
}
