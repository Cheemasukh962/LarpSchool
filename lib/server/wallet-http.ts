import { NextResponse } from "next/server";

import { ensurePlayer, isSupabaseConfigured, type PlayerRow } from "./players";
import { ensureDeviceId } from "./session";
import { WalletError, walletHttpStatus } from "./wallet";

export async function requireWalletPlayer(): Promise<PlayerRow> {
  if (!isSupabaseConfigured()) {
    throw new WalletError("bad_request", "local mode");
  }
  const deviceId = await ensureDeviceId();
  return ensurePlayer(deviceId);
}

export function walletErrorResponse(err: unknown): NextResponse {
  if (err instanceof WalletError) {
    return NextResponse.json({ error: err.code, message: err.message }, { status: walletHttpStatus(err.code) });
  }
  const message = err instanceof Error ? err.message : "wallet failed";
  return NextResponse.json({ error: "bad_request", message }, { status: 400 });
}
