import { NextResponse } from "next/server";

import { attachAuth, ensurePlayer } from "@/lib/server/players";
import { ensureDeviceId } from "@/lib/server/session";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/server/supabase";

/**
 * Supabase magic-link landing. Configure the auth redirect URL to this route.
 * After verify, the device cookie's player is attached (or merged) to the auth user.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const tokenHash = url.searchParams.get("token_hash") || url.searchParams.get("token");
  const type = (url.searchParams.get("type") || "email") as "email" | "magiclink";
  const origin = process.env.NEXT_PUBLIC_SITE_URL || url.origin;
  const next = new URL("/", origin);

  if (!isSupabaseConfigured() || !tokenHash) {
    next.searchParams.set("auth", "missing");
    return NextResponse.redirect(next);
  }

  const { data, error } = await supabaseAdmin().auth.verifyOtp({ token_hash: tokenHash, type });
  if (error || !data.user) {
    next.searchParams.set("auth", "failed");
    return NextResponse.redirect(next);
  }

  const deviceId = await ensureDeviceId();
  const player = await ensurePlayer(deviceId);
  await attachAuth(player, data.user.id, data.user.email ?? null);

  next.searchParams.set("auth", "ok");
  return NextResponse.redirect(next);
}
