import { readFileSync } from "node:fs";
import path from "node:path";

import type { Card, CardsPayload } from "@/lib/types";
import type { LeaderboardPayload, LeaderRow } from "@/lib/leaderboard-types";
import { isSupabaseConfigured, supabaseAdmin } from "./supabase";

export type { LeaderboardPayload, LeaderRow };

let cardIndex: Map<string, Card> | null = null;

function cardsById(): Map<string, Card> {
  if (cardIndex) return cardIndex;
  const file = path.join(process.cwd(), "public", "data", "cards.json");
  const payload = JSON.parse(readFileSync(file, "utf8")) as CardsPayload;
  cardIndex = new Map(payload.cards.map((c) => [c.id, c]));
  return cardIndex;
}

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "?";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase();
}

export async function loadLeaderboard(youPlayerId: string | null): Promise<LeaderboardPayload> {
  if (!isSupabaseConfigured()) {
    return { mode: "local", updatedAt: new Date().toISOString(), rows: [] };
  }

  const db = supabaseAdmin();
  const players = await db
    .from("players")
    .select("id, display_name, tokens, battles_won, is_guest, claims(battler_id)")
    .order("battles_won", { ascending: false })
    .order("tokens", { ascending: false })
    .limit(80);

  if (players.error) throw players.error;

  const names = cardsById();
  const scored = (players.data ?? [])
    .map((row) => {
      const claim = Array.isArray(row.claims) ? row.claims[0] : row.claims;
      const battlerId = (claim as { battler_id?: string } | null)?.battler_id ?? null;
      const card = battlerId ? names.get(battlerId) : undefined;
      const name = card?.name || row.display_name || null;
      if (!name && !row.battles_won) return null;
      return {
        name: name || "ANONYMOUS",
        initials: card?.initials || initialsFrom(name || "??"),
        battlesWon: Number(row.battles_won ?? 0),
        tokens: Number(row.tokens ?? 0),
        guest: Boolean(row.is_guest) || Boolean(battlerId?.startsWith("guest:")),
        you: youPlayerId !== null && row.id === youPlayerId,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => b.battlesWon - a.battlesWon || b.tokens - a.tokens)
    .slice(0, 25)
    .map((row, i) => ({ ...row, rank: i + 1 }));

  return { mode: "supabase", updatedAt: new Date().toISOString(), rows: scored };
}
