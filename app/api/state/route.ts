import { NextResponse } from "next/server";

/**
 * Phase 2 wrote tokens from the phone. Phase 3 ignores that. Wallet mutations go
 * through /api/battle /trivia /slots /chest /equip so two tabs cannot mint tokens.
 */
export async function POST() {
  return NextResponse.json({ ok: true, mode: "server-wallet" });
}
