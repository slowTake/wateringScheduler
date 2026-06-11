/** Canonical app origin for Supabase auth email links (reset, confirm). */
export function getAppOrigin(): string {
  const configured = import.meta.env.VITE_APP_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export function authRedirectPath(path: string): string {
  const origin = getAppOrigin();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return origin ? `${origin}${normalized}` : normalized;
}

/** Parse Supabase auth errors returned in the URL hash after a failed redirect. */
export function getAuthHashError(): string | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  if (params.get("error") !== "access_denied" && !params.get("error_code")) return null;
  const description = params.get("error_description");
  if (description) return description.replace(/\+/g, " ");
  const code = params.get("error_code");
  if (code === "otp_expired") return "This reset link has expired. Request a new one.";
  return params.get("error") ?? "Authentication link failed.";
}
