import { NextResponse } from "next/server";

import { loadLeaderboard } from "@/lib/server/leaderboard";
import { ensurePlayer, isSupabaseConfigured } from "@/lib/server/players";
import { getDeviceId } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export async function GET() {
  let you: string | null = null;
  if (isSupabaseConfigured()) {
    const deviceId = await getDeviceId();
    if (deviceId) {
      const player = await ensurePlayer(deviceId);
      you = player.id;
    }
  }

  const board = await loadLeaderboard(you);
  return NextResponse.json(board, {
    headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=45" },
  });
}
