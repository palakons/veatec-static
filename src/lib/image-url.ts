const BUCKET_NAME = "one-order-af750.firebasestorage.app";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "/veatec";

/**
 * Resolves any image URL for static hosting:
 * - Converts relative "/api/images/..." paths into direct Firebase Storage URLs
 * - Prefixes relative public paths (e.g. "/veatec-logo.png") with basePath ("/veatec")
 * - Resolves promptpay.io fallback if promptpayNumber is provided
 */
export function resolveImageUrl(url?: string | null): string | null {
  if (!url) return null;

  if (url.startsWith("/api/images/")) {
    const rawPath = url.replace(/^\/api\/images\//, "").split("?")[0];
    return `https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o/${encodeURIComponent(rawPath)}?alt=media`;
  }

  // If it's a relative path starting with "/" but not basePath and not https://
  if (url.startsWith("/") && !url.startsWith("http://") && !url.startsWith("https://")) {
    if (!url.startsWith(BASE_PATH)) {
      return `${BASE_PATH}${url}`;
    }
  }

  return url;
}

export function resolveShopPromptPayQr(shop: { promptpayQrUrl?: string | null; promptpayNumber?: string | null }): string | null {
  if (shop.promptpayQrUrl) {
    return resolveImageUrl(shop.promptpayQrUrl);
  }
  const cleanNumber = (shop.promptpayNumber || "").replace(/\D/g, "");
  if (cleanNumber.length >= 10) {
    return `https://promptpay.io/${cleanNumber}.png`;
  }
  return null;
}
