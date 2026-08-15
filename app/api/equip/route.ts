import { NextResponse } from "next/server";

import { requireWalletPlayer, walletErrorResponse } from "@/lib/server/wallet-http";
import { setEquipped, WalletError } from "@/lib/server/wallet";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { uid?: string; equipped?: boolean };
    if (!body.uid || typeof body.equipped !== "boolean") {
      throw new WalletError("bad_request", "uid and equipped required");
    }
    const player = await requireWalletPlayer();
    return NextResponse.json(await setEquipped(player, body.uid, body.equipped));
  } catch (err) {
    return walletErrorResponse(err);
  }
}
