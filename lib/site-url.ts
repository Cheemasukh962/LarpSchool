/** Public URL phones should open. Prefer the env host so a localhost TV does not QR to itself. */
export function publicSiteUrl(): string {
  const env = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/$/, "");
  if (env && !/localhost|127\.0\.0\.1/i.test(env)) return env;
  if (typeof window !== "undefined") return window.location.origin;
  return env || "http://localhost:3000";
}

export const STARTING_TOKENS = 3;
