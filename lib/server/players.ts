import type { OwnedItem } from "@/lib/chest";
import { localSnapshot, type SessionSnapshot } from "@/lib/session-types";
import { JACKPOT_SEED } from "@/lib/slots";
import { isSupabaseConfigured, supabaseAdmin } from "./supabase";

export type { SessionSnapshot };
export { localSnapshot };

export interface PlayerRow {
  id: string;
  device_id: string;
  auth_user_id: string | null;
  email: string | null;
  display_name: string | null;
  is_guest: boolean;
  tokens: number;
  battles_won: number;
  trivia_correct: number;
  trivia_answered: number;
  inventory: OwnedItem[];
}

function asPlayer(row: Record<string, unknown>): PlayerRow {
  return {
    id: String(row.id),
    device_id: String(row.device_id),
    auth_user_id: (row.auth_user_id as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    display_name: (row.display_name as string | null) ?? null,
    is_guest: Boolean(row.is_guest),
    tokens: Number(row.tokens ?? 3),
    battles_won: Number(row.battles_won ?? 0),
    trivia_correct: Number(row.trivia_correct ?? 0),
    trivia_answered: Number(row.trivia_answered ?? 0),
    inventory: Array.isArray(row.inventory) ? (row.inventory as OwnedItem[]) : [],
  };
}

export async function ensurePlayer(deviceId: string): Promise<PlayerRow> {
  const db = supabaseAdmin();
  const found = await db.from("players").select("*").eq("device_id", deviceId).maybeSingle();
  if (found.error) throw found.error;
  if (found.data) return asPlayer(found.data);

  const created = await db.from("players").insert({ device_id: deviceId }).select("*").single();
  if (created.error) throw created.error;
  return asPlayer(created.data);
}

export async function snapshotFor(player: PlayerRow): Promise<SessionSnapshot> {
  const db = supabaseAdmin();
  const claim = await db.from("claims").select("battler_id").eq("player_id", player.id).maybeSingle();
  if (claim.error) throw claim.error;
  const pot = await db.from("economy").select("jackpot").eq("id", 1).maybeSingle();
  return {
    mode: "supabase",
    playerId: player.id,
    battlerId: claim.data?.battler_id ?? null,
    isGuest: player.is_guest,
    displayName: player.display_name,
    email: player.email,
    tokens: player.tokens,
    jackpot: pot.error || !pot.data ? JACKPOT_SEED : Number(pot.data.jackpot ?? JACKPOT_SEED),
    battlesWon: player.battles_won,
    triviaCorrect: player.trivia_correct,
    triviaAnswered: player.trivia_answered,
    inventory: player.inventory,
    hasAuth: Boolean(player.auth_user_id),
  };
}

export async function claimBattler(playerId: string, battlerId: string): Promise<void> {
  const db = supabaseAdmin();
  const { error } = await db.rpc("claim_battler", { p_player: playerId, p_battler: battlerId });
  if (error) {
    if (error.message.includes("taken") || error.code === "P0001" || error.code === "23505") {
      const taken = new Error("taken");
      taken.name = "ClaimTaken";
      throw taken;
    }
    throw error;
  }
}

export async function claimGuest(playerId: string, name: string): Promise<string> {
  const db = supabaseAdmin();
  const { data, error } = await db.rpc("claim_guest", { p_player: playerId, p_name: name });
  if (error) throw error;
  return String(data);
}

export async function releaseClaim(playerId: string): Promise<void> {
  const db = supabaseAdmin();
  const { error } = await db.from("claims").delete().eq("player_id", playerId);
  if (error) throw error;
  await db.from("players").update({ is_guest: false, display_name: null }).eq("id", playerId);
}

export async function attachAuth(player: PlayerRow, authUserId: string, email: string | null): Promise<PlayerRow> {
  const db = supabaseAdmin();
  const existing = await db.from("players").select("*").eq("auth_user_id", authUserId).maybeSingle();
  if (existing.error) throw existing.error;

  if (existing.data && existing.data.id !== player.id) {
    const { error } = await db.rpc("merge_players", { p_keep: existing.data.id, p_drop: player.id });
    if (error) throw error;
    await db
      .from("players")
      .update({ device_id: player.device_id, email: email ?? existing.data.email })
      .eq("id", existing.data.id);
    const merged = await db.from("players").select("*").eq("id", existing.data.id).single();
    if (merged.error) throw merged.error;
    return asPlayer(merged.data);
  }

  const { error } = await db
    .from("players")
    .update({ auth_user_id: authUserId, email })
    .eq("id", player.id);
  if (error) throw error;
  return { ...player, auth_user_id: authUserId, email };
}

export { isSupabaseConfigured };
