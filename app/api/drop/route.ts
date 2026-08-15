import { NextResponse } from "next/server";

import { requireWalletPlayer, walletErrorResponse } from "@/lib/server/wallet-http";
import { dropInventoryItem, WalletError } from "@/lib/server/wallet";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { uid?: string };
    if (!body.uid) throw new WalletError("bad_request", "uid required");
    const player = await requireWalletPlayer();
    return NextResponse.json(await dropInventoryItem(player, body.uid));
  } catch (err) {
    return walletErrorResponse(err);
  }
}
