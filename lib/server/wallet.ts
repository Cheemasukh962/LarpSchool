import { guestCard, isGuestId } from "@/lib/adapt";
import { resolveBattle } from "@/lib/battle";
import { CHEST_COST, itemById, weightedChestItem, type OwnedItem } from "@/lib/chest";
import { applyEquip, clampEquipped, payoutMultiplier, sumGear } from "@/lib/gear";
import { BET_OPTIONS, drawSpin, JACKPOT_SEED, symbolById } from "@/lib/slots";
import type {
  WalletBattleResult,
  WalletChestResult,
  WalletEquipResult,
  WalletSpinResult,
  WalletTriviaResult,
} from "@/lib/wallet-types";

import { cardById, questionById } from "./data";
import type { PlayerRow } from "./players";
import { supabaseAdmin } from "./supabase";

export type WalletCode =
  | "insufficient"
  | "rate_limited"
  | "no_player"
  | "no_claim"
  | "bad_request"
  | "missing_rpc";

export class WalletError extends Error {
  constructor(
    public code: WalletCode,
    message?: string
  ) {
    super(message ?? code);
    this.name = "WalletError";
  }
}

export function isIdempotencyKey(key: unknown): key is string {
  return typeof key === "string" && /^[A-Za-z0-9:_-]{8,80}$/.test(key);
}

type RpcRow = {
  replay?: boolean;
  tokens?: number;
  jackpot?: number;
  battlesWon?: number;
  triviaCorrect?: number;
  triviaAnswered?: number;
  delta?: number;
  inventory?: OwnedItem[];
  meta?: Record<string, unknown>;
};

function asRpcError(error: { message?: string; code?: string; details?: string }): WalletError {
  const text = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  if (text.includes("could not find the function") || text.includes("does not exist") || error.code === "PGRST202") {
    return new WalletError("missing_rpc", "phase 3 sql not applied");
  }
  if (text.includes("rate_limited")) return new WalletError("rate_limited");
  if (text.includes("insufficient")) return new WalletError("insufficient");
  if (text.includes("no_player")) return new WalletError("no_player");
  return new WalletError("bad_request", error.message || "wallet failed");
}

async function rpc(name: string, args: Record<string, unknown>): Promise<RpcRow> {
  const { data, error } = await supabaseAdmin().rpc(name, args);
  if (error) throw asRpcError(error);
  return (data ?? {}) as RpcRow;
}

export async function readJackpot(): Promise<number> {
  const { data, error } = await supabaseAdmin().from("economy").select("jackpot").eq("id", 1).maybeSingle();
  if (error || !data) return JACKPOT_SEED;
  return Number(data.jackpot ?? JACKPOT_SEED);
}

function playerGear(player: PlayerRow) {
  return sumGear(clampEquipped(player.inventory).filter((i) => i.equipped));
}

export async function claimedBattlerId(playerId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin().from("claims").select("battler_id").eq("player_id", playerId).maybeSingle();
  if (error) throw error;
  return data?.battler_id ?? null;
}

function playerCard(player: PlayerRow, battlerId: string) {
  if (isGuestId(battlerId)) {
    return guestCard(player.display_name || "WALK-IN", battlerId);
  }
  const card = cardById(battlerId);
  if (!card) return null;
  const flex = playerGear(player).flex;
  return flex > 0 ? { ...card, flex_score: card.flex_score + flex } : card;
}

export async function creditBattle(
  player: PlayerRow,
  input: { challengerId: string; guessId: string; key: string }
): Promise<WalletBattleResult> {
  const battlerId = await claimedBattlerId(player.id);
  if (!battlerId) throw new WalletError("no_claim");

  const self = playerCard(player, battlerId);
  const rawOpp = isGuestId(input.challengerId) ? null : cardById(input.challengerId);
  if (!self || !rawOpp) throw new WalletError("bad_request", "unknown fighter");
  if (rawOpp.id === self.id || (isGuestId(battlerId) && input.challengerId === battlerId)) {
    throw new WalletError("bad_request", "same fighter");
  }

  const result = resolveBattle(self, rawOpp);
  const betWon = input.guessId === result.winner_id;
  const kind = betWon ? "battle_win" : "battle_loss";
  const amount = betWon ? 1 : 0;
  const row = await rpc("wallet_credit", {
    p_player: player.id,
    p_amount: amount,
    p_kind: kind,
    p_key: input.key,
    p_meta: {
      challengerId: input.challengerId,
      guessId: input.guessId,
      winnerId: result.winner_id,
      betWon,
    },
  });

  return {
    tokens: Number(row.tokens ?? player.tokens),
    battlesWon: Number(row.battlesWon ?? player.battles_won),
    betWon,
    replay: Boolean(row.replay),
  };
}

export async function creditTrivia(
  player: PlayerRow,
  input: { questionId: string; answerIndex: number; key: string }
): Promise<WalletTriviaResult> {
  const question = questionById(input.questionId);
  if (!question) throw new WalletError("bad_request", "unknown question");
  if (!Number.isInteger(input.answerIndex) || input.answerIndex < 0 || input.answerIndex >= question.options.length) {
    throw new WalletError("bad_request", "bad answer");
  }

  const correct = input.answerIndex === question.correct;
  const row = await rpc("wallet_credit", {
    p_player: player.id,
    p_amount: correct ? 1 : 0,
    p_kind: correct ? "trivia_correct" : "trivia_wrong",
    p_key: input.key,
    p_meta: { questionId: input.questionId, answerIndex: input.answerIndex, correct },
  });

  return {
    tokens: Number(row.tokens ?? player.tokens),
    triviaCorrect: Number(row.triviaCorrect ?? player.trivia_correct),
    triviaAnswered: Number(row.triviaAnswered ?? player.trivia_answered),
    correct,
    replay: Boolean(row.replay),
  };
}

export async function playSlots(player: PlayerRow, input: { bet: number; key: string }): Promise<WalletSpinResult> {
  if (!(BET_OPTIONS as readonly number[]).includes(input.bet)) {
    throw new WalletError("bad_request", "bad bet");
  }

  const gear = playerGear(player);
  const pot = await readJackpot();
  const outcome = drawSpin(input.bet, pot, gear.luck);
  const win = outcome.jackpot ? outcome.win : Math.floor(outcome.win * payoutMultiplier(gear.payout));
  const reels = outcome.reels.map((s) => s.id) as [string, string, string];
  const meta = { reels, win, jackpotHit: outcome.jackpot, bet: input.bet };

  const row = await rpc("wallet_spin", {
    p_player: player.id,
    p_bet: input.bet,
    p_payout: win,
    p_jackpot_hit: outcome.jackpot,
    p_key: input.key,
    p_meta: meta,
  });

  const stored = (row.meta ?? meta) as typeof meta;
  const ids = (stored.reels ?? reels) as [string, string, string];
  return {
    tokens: Number(row.tokens ?? player.tokens),
    jackpot: Number(row.jackpot ?? pot),
    bet: Number(stored.bet ?? input.bet),
    win: Number(stored.win ?? win),
    jackpotHit: Boolean(stored.jackpotHit),
    reels: [symbolById(ids[0]).id, symbolById(ids[1]).id, symbolById(ids[2]).id],
    replay: Boolean(row.replay),
  };
}

export async function playChest(player: PlayerRow, input: { key: string }): Promise<WalletChestResult> {
  const gear = playerGear(player);
  const drop = weightedChestItem(gear.luck);
  const item: OwnedItem = {
    ...drop,
    uid: crypto.randomUUID(),
    equipped: false,
  };

  const row = await rpc("wallet_chest", {
    p_player: player.id,
    p_cost: CHEST_COST,
    p_item: item,
    p_key: input.key,
    p_meta: { itemId: item.id, uid: item.uid, rarity: item.rarity },
  });

  const inventory = Array.isArray(row.inventory) ? (row.inventory as OwnedItem[]) : [...player.inventory, item];
  const fromMeta = (row.meta as { uid?: string } | undefined)?.uid;
  const won = inventory.find((i) => i.uid === fromMeta) ?? inventory[inventory.length - 1] ?? item;
  return {
    tokens: Number(row.tokens ?? player.tokens),
    item: itemById(won.id) ? { ...itemById(won.id), uid: won.uid, equipped: Boolean(won.equipped) } : won,
    inventory,
    replay: Boolean(row.replay),
  };
}

export async function setEquipped(
  player: PlayerRow,
  uid: string,
  equipped: boolean
): Promise<WalletEquipResult> {
  const current = clampEquipped(player.inventory);
  const target = current.find((i) => i.uid === uid);
  if (!target) throw new WalletError("bad_request", "unknown item");

  const next = applyEquip(current, uid, equipped);
  const { error } = await supabaseAdmin().from("players").update({ inventory: next }).eq("id", player.id);
  if (error) throw error;
  return { inventory: next };
}

export function walletHttpStatus(code: WalletCode): number {
  if (code === "rate_limited") return 429;
  if (code === "insufficient") return 409;
  if (code === "missing_rpc") return 503;
  if (code === "no_claim" || code === "no_player") return 404;
  return 400;
}
