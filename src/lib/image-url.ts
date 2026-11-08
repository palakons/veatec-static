const BUCKET_NAME = "one-order-af750.firebasestorage.app";

/**
 * Resolves any image URL for static hosting:
 * - Converts relative "/api/images/..." paths into direct Firebase Storage URLs
 * - Resolves promptpay.io fallback if promptpayNumber is provided
 */
export function resolveImageUrl(url?: string | null): string | null {
  if (!url) return null;

  if (url.startsWith("/api/images/")) {
    const rawPath = url.replace(/^\/api\/images\//, "").split("?")[0];
    return `https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o/${encodeURIComponent(rawPath)}?alt=media`;
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
