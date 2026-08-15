import { NextResponse } from "next/server";

import { requireWalletPlayer, walletErrorResponse } from "@/lib/server/wallet-http";
import { isIdempotencyKey, playSlots, WalletError } from "@/lib/server/wallet";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { bet?: number; key?: string };
    if (!Number.isInteger(body.bet) || !isIdempotencyKey(body.key)) {
      throw new WalletError("bad_request", "bet and key required");
    }
    const player = await requireWalletPlayer();
    return NextResponse.json(await playSlots(player, { bet: body.bet as number, key: body.key }));
  } catch (err) {
    return walletErrorResponse(err);
  }
}
