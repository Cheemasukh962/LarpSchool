/**
 * Port of `battle()` in scripts/larp_engine.py.
 *
 * Python stays the source of truth for *scoring*; this only decides a matchup between two
 * already-scored cards. Kept pure so a fight resolves instantly on-device, works offline,
 * and can be re-verified server-side for free when we record it.
 *
 * scripts/test_battle_parity.mjs asserts this agrees with the Python version.
 */
import type { BattleResult, Card } from "./types";

/** Below this score gap, the rubric isn't confident and Groq may act as judge (Phase 4). */
export const PHOTO_FINISH_MARGIN = 5;

export function toneFor(margin: number): string {
  if (margin >= 20) return "it was not close";
  if (margin >= 8) return "a clean hit";
  return "a photo-finish between two LinkedIn mains";
}

/**
 * Mirrors the Python tuple compare `(flex_score, -larp_index, name)`.
 * Returns > 0 when `a` outranks `b`.
 */
function compareKey(a: Card, b: Card): number {
  if (a.flex_score !== b.flex_score) return a.flex_score - b.flex_score;
  if (a.larp_index !== b.larp_index) return b.larp_index - a.larp_index;
  const an = a.name || "";
  const bn = b.name || "";
  if (an === bn) return 0;
  return an > bn ? 1 : -1;
}

/**
 * Which term of the compare actually decided it. Presentation only — scores cluster hard
 * enough that identical totals are common, and a screen reading "88 to 88" with a winner
 * crowned and no explanation looks like a bug.
 */
function tiebreakFor(a: Card, b: Card): BattleResult["tiebreak"] {
  if (a.flex_score !== b.flex_score) return "score";
  if (a.larp_index !== b.larp_index) return "larp_index";
  return "name";
}

export function resolveBattle(a: Card, b: Card): BattleResult {
  // Python uses `>=`, so an exact tie resolves to the first argument.
  const aWins = compareKey(a, b) >= 0;
  const winner = aWins ? a : b;
  const loser = aWins ? b : a;

  const margin = Math.abs(a.flex_score - b.flex_score);
  const tone = toneFor(margin);

  // The Python version appends a seeded "judge's note" when winner.larp_index >= 40.
  // That is unreachable with the current weights (stealth 12 + founder 8 + incoming 10 +
  // stuffed headline 8 = 38 ceiling, and the observed max across all 795 is 20), so there
  // is no Mersenne Twister to emulate here. If larp_index ever gains a term, the parity
  // test starts failing and this comment is the place to look.
  const headline = `${winner.name} beats ${loser.name} ${winner.flex_score}-${loser.flex_score} — ${tone}.`;
  const verdict = `${headline} ${winner.compliment} ${loser.roast}`;

  return {
    winner_id: winner.id,
    loser_id: loser.id,
    winner_name: winner.name,
    loser_name: loser.name,
    winner_score: winner.flex_score,
    loser_score: loser.flex_score,
    margin,
    verdict,
    headline,
    winner_compliment: winner.compliment,
    loser_roast: loser.roast,
    photo_finish: margin < PHOTO_FINISH_MARGIN,
    tiebreak: tiebreakFor(a, b),
  };
}

/** Stable key for caching a verdict for one pairing, regardless of who initiated. */
export function pairKey(aId: string, bId: string): string {
  return [aId, bId].sort().join("|");
}
