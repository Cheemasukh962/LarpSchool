import { NextResponse } from "next/server";

import { requireWalletPlayer, walletErrorResponse } from "@/lib/server/wallet-http";
import { creditTrivia, isIdempotencyKey, WalletError } from "@/lib/server/wallet";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      questionId?: string;
      answerIndex?: number;
      key?: string;
    };
    if (!body.questionId || !Number.isInteger(body.answerIndex) || !isIdempotencyKey(body.key)) {
      throw new WalletError("bad_request", "questionId, answerIndex, key required");
    }
    const player = await requireWalletPlayer();
    const result = await creditTrivia(player, {
      questionId: body.questionId,
      answerIndex: body.answerIndex as number,
      key: body.key,
    });
    return NextResponse.json(result);
  } catch (err) {
    return walletErrorResponse(err);
  }
}
