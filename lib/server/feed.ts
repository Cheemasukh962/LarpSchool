import { guestCard, isGuestId } from "@/lib/adapt";
import type { FeedPayload } from "@/lib/feed-types";
import { cardById } from "./data";
import { isSupabaseConfigured, supabaseAdmin } from "./supabase";

export type { FeedPayload };

function nameFor(id: string | null | undefined, fallback: string | null): string {
  if (!id) return fallback || "ANONYMOUS";
  if (isGuestId(id)) return fallback || "WALK-IN";
  return cardById(id)?.name || fallback || "ANONYMOUS";
}

export async function loadFeed(): Promise<FeedPayload> {
  if (!isSupabaseConfigured()) {
    return { mode: "local", updatedAt: new Date().toISOString(), fights: [] };
  }

  const db = supabaseAdmin();
  const rows = await db
    .from("ledger")
    .select("created_at, kind, meta, player_id")
    .in("kind", ["battle_win", "battle_loss"])
    .order("created_at", { ascending: false })
    .limit(24);

  if (rows.error) throw rows.error;

  const playerIds = [...new Set((rows.data ?? []).map((r) => String(r.player_id)))];
  const players =
    playerIds.length === 0
      ? { data: [] as Array<{ id: string; display_name: string | null }>, error: null }
      : await db.from("players").select("id, display_name").in("id", playerIds);
  if (players.error) throw players.error;

  const claims =
    playerIds.length === 0
      ? { data: [] as Array<{ player_id: string; battler_id: string }>, error: null }
      : await db.from("claims").select("player_id, battler_id").in("player_id", playerIds);
  if (claims.error) throw claims.error;

  const names = new Map((players.data ?? []).map((p) => [p.id, p.display_name]));
  const battlers = new Map((claims.data ?? []).map((c) => [c.player_id, c.battler_id]));

  const fights = (rows.data ?? []).map((row) => {
    const meta = (row.meta ?? {}) as {
      challengerId?: string;
      winnerId?: string;
      betWon?: boolean;
    };
    const battlerId = battlers.get(String(row.player_id)) ?? null;
    const display = names.get(String(row.player_id)) ?? null;
    const playerName = battlerId
      ? isGuestId(battlerId)
        ? guestCard(display || "WALK-IN", battlerId).name
        : nameFor(battlerId, display)
      : display || "ANONYMOUS";
    return {
      at: String(row.created_at),
      betWon: Boolean(meta.betWon ?? row.kind === "battle_win"),
      playerName,
      winnerName: nameFor(meta.winnerId, null),
      challengerName: nameFor(meta.challengerId, null),
    };
  });

  return { mode: "supabase", updatedAt: new Date().toISOString(), fights };
}
