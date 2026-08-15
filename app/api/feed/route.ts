import { NextResponse } from "next/server";

import { loadFeed } from "@/lib/server/feed";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const feed = await loadFeed();
    return NextResponse.json(feed, {
      headers: { "Cache-Control": "public, max-age=2, stale-while-revalidate=8" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "feed failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
