import { NextResponse } from "next/server";

import {
  claimBattler,
  ensurePlayer,
  isSupabaseConfigured,
  localSnapshot,
  releaseClaim,
  snapshotFor,
} from "@/lib/server/players";
import { ensureDeviceId } from "@/lib/server/session";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { battlerId?: string };
  const battlerId = body.battlerId?.trim();
  if (!battlerId) return NextResponse.json({ error: "battlerId required" }, { status: 400 });
  if (battlerId.startsWith("guest:")) {
    return NextResponse.json({ error: "use /api/guest for walk-ins" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ...localSnapshot(), battlerId, mode: "local" });
  }

  const deviceId = await ensureDeviceId();
  const player = await ensurePlayer(deviceId);
  try {
    await claimBattler(player.id, battlerId);
  } catch (err) {
    if (err instanceof Error && err.name === "ClaimTaken") {
      return NextResponse.json({ error: "That card is already claimed on another phone." }, { status: 409 });
    }
    throw err;
  }
  const fresh = await ensurePlayer(deviceId);
  return NextResponse.json(await snapshotFor(fresh));
}

export async function DELETE() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(localSnapshot());
  }
  const deviceId = await ensureDeviceId();
  const player = await ensurePlayer(deviceId);
  await releaseClaim(player.id);
  const fresh = await ensurePlayer(deviceId);
  return NextResponse.json(await snapshotFor(fresh));
}
