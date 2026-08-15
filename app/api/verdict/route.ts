import { NextResponse } from "next/server";

import type { VerdictRequest } from "@/lib/flavor-types";
import { flavorFor, groqStatus } from "@/lib/server/groq";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(groqStatus());
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<VerdictRequest>;
  if (!body.winnerId || !body.loserId || !body.winnerName || !body.loserName) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (typeof body.winnerScore !== "number" || typeof body.loserScore !== "number") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const payload: VerdictRequest = {
    winnerId: body.winnerId,
    loserId: body.loserId,
    winnerName: body.winnerName,
    loserName: body.loserName,
    winnerScore: body.winnerScore,
    loserScore: body.loserScore,
    margin: Number(body.margin ?? Math.abs(body.winnerScore - body.loserScore)),
    photoFinish: Boolean(body.photoFinish),
    tiebreak: body.tiebreak === "larp_index" || body.tiebreak === "name" || body.tiebreak === "score" ? body.tiebreak : "score",
  };

  const flavor = await flavorFor(payload);
  return NextResponse.json(flavor);
}
