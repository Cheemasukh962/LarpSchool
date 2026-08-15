import { NextResponse } from "next/server";

import { claimGuest, ensurePlayer, isSupabaseConfigured, localSnapshot, snapshotFor } from "@/lib/server/players";
import { ensureDeviceId } from "@/lib/server/session";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  if (name.length > 40) return NextResponse.json({ error: "name too long" }, { status: 400 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ...localSnapshot(),
      isGuest: true,
      displayName: name,
      battlerId: "guest:local",
    });
  }

  const deviceId = await ensureDeviceId();
  const player = await ensurePlayer(deviceId);
  const battlerId = await claimGuest(player.id, name);
  const fresh = await ensurePlayer(deviceId);
  const snap = await snapshotFor(fresh);
  return NextResponse.json({ ...snap, battlerId, isGuest: true, displayName: name });
}
