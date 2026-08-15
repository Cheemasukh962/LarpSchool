import { NextResponse } from "next/server";

import { requireWalletPlayer, walletErrorResponse } from "@/lib/server/wallet-http";
import { creditBattle, isIdempotencyKey, WalletError } from "@/lib/server/wallet";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      challengerId?: string;
      guessId?: string;
      key?: string;
    };
    if (!body.challengerId || !body.guessId || !isIdempotencyKey(body.key)) {
      throw new WalletError("bad_request", "challengerId, guessId, key required");
    }
    const player = await requireWalletPlayer();
    const result = await creditBattle(player, {
      challengerId: body.challengerId,
      guessId: body.guessId,
      key: body.key,
    });
    return NextResponse.json(result);
  } catch (err) {
    return walletErrorResponse(err);
  }
}
