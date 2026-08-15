import { NextResponse } from "next/server";

import { requireWalletPlayer, walletErrorResponse } from "@/lib/server/wallet-http";
import { isIdempotencyKey, playChest, WalletError } from "@/lib/server/wallet";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { key?: string };
    if (!isIdempotencyKey(body.key)) {
      throw new WalletError("bad_request", "key required");
    }
    const player = await requireWalletPlayer();
    return NextResponse.json(await playChest(player, { key: body.key }));
  } catch (err) {
    return walletErrorResponse(err);
  }
}
