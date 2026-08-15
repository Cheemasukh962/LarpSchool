import { NextResponse } from "next/server";

import { localSnapshot, ensurePlayer, snapshotFor, isSupabaseConfigured } from "@/lib/server/players";
import { ensureDeviceId } from "@/lib/server/session";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(localSnapshot());
  }
  const deviceId = await ensureDeviceId();
  const player = await ensurePlayer(deviceId);
  return NextResponse.json(await snapshotFor(player));
}
