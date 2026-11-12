/**
 * Shared Cloud Functions endpoints & Client Authentication Secret
 */
export const VEATEC_FUNCTIONS_CONFIG = {
  appSecret:
    process.env.NEXT_PUBLIC_VEATEC_APP_SECRET ||
    "8f9d4bf6f8583cf475720e867a806ccec6cbbf1a541cc1ec",
  thaillmProxyUrl: "https://thaillmproxy-onlcrhe4ea-uc.a.run.app",
  sendLineNotificationUrl:
    "https://us-central1-one-order-af750.cloudfunctions.net/sendLineNotification",
};

/**
 * Standard authenticated fetch helper for vEATec Cloud Functions
 */
export async function fetchWithVeatecAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  headers.set("x-veatec-secret", VEATEC_FUNCTIONS_CONFIG.appSecret);

  return fetch(url, {
    ...options,
    headers,
  });
}
