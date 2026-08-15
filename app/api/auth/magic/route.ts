import { NextResponse } from "next/server";

import { ensurePlayer, isSupabaseConfigured } from "@/lib/server/players";
import { ensureDeviceId } from "@/lib/server/session";
import { supabaseAnon } from "@/lib/server/supabase";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: string };
  const email = body.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  if (!isSupabaseConfigured() || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ ok: true, local: true });
  }

  const deviceId = await ensureDeviceId();
  const player = await ensurePlayer(deviceId);
  const origin = process.env.NEXT_PUBLIC_SITE_URL || req.headers.get("origin") || "http://localhost:3000";

  const { error } = await supabaseAnon().auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${origin}/api/auth/callback`,
    },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { supabaseAdmin } = await import("@/lib/server/supabase");
  await supabaseAdmin().from("players").update({ email }).eq("id", player.id);

  return NextResponse.json({ ok: true });
}
