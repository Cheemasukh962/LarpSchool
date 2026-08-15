import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function supabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
}

function publishableKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY
  );
}

function secretKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
}

/**
 * Secret-key client for API routes. RLS on players/claims denies the publishable key,
 * so the browser never writes those tables — the httpOnly device cookie is the
 * credential, and this client is the only thing that trusts it.
 *
 * New dashboard keys (`sb_publishable_…` / `sb_secret_…`) and legacy JWT anon /
 * service_role keys both work. `@supabase/server` is not required for this app.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl() && secretKey());
}

export function supabaseAdmin(): SupabaseClient {
  const url = supabaseUrl();
  const key = secretKey();
  if (!url || !key) throw new Error("supabase is not configured");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function supabaseAnon(): SupabaseClient {
  const url = supabaseUrl();
  const key = publishableKey();
  if (!url || !key) throw new Error("supabase anon is not configured");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
