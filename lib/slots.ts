/**
 * Slot symbols and payout rules, lifted out of the mock component.
 *
 * The RNG here is client-side for now. Phase 3 moves the draw to the server and leaves
 * this module holding only the symbol table and the payout math, which the client still
 * needs in order to animate toward a result the server already decided.
 */

export interface SlotSymbol {
  id: string;
  icon: string;
  name: string;
  mult: number;
  prob: number;
  color: string;
}

export const SLOT_SYMBOLS: SlotSymbol[] = [
  { id: "jester", icon: "🃏", name: "JESTER", mult: 2, prob: 38, color: "#888888" },
  { id: "sword", icon: "⚔️", name: "SWORD", mult: 3, prob: 28, color: "#4a9eff" },
  { id: "shield", icon: "🛡️", name: "SHIELD", mult: 5, prob: 18, color: "#a855f7" },
  { id: "crown", icon: "👑", name: "CROWN", mult: 10, prob: 12, color: "#ec4899" },
  { id: "star", icon: "⭐", name: "STAR", mult: 0, prob: 4, color: "#ffd700" },
];

export const BET_OPTIONS = [1, 2, 5] as const;
export const JACKPOT_SEED = 50;

export function symbolById(id: string): SlotSymbol {
  return SLOT_SYMBOLS.find((s) => s.id === id) ?? SLOT_SYMBOLS[0];
}

export function pickSymbol(): SlotSymbol {
  let r = Math.random() * 100;
  for (const s of SLOT_SYMBOLS) {
    r -= s.prob;
    if (r <= 0) return s;
  }
  return SLOT_SYMBOLS[0];
}

export interface SpinOutcome {
  reels: [SlotSymbol, SlotSymbol, SlotSymbol];
  win: number;
  jackpot: boolean;
}

/** Triple pays the multiplier, a triple star takes the pot, any pair returns the bet. */
export function evaluateSpin(
  reels: [SlotSymbol, SlotSymbol, SlotSymbol],
  bet: number,
  jackpot: number
): SpinOutcome {
  const [a, b, c] = reels;
  if (a.id === b.id && b.id === c.id) {
    if (a.id === "star") return { reels, win: jackpot, jackpot: true };
    return { reels, win: bet * a.mult, jackpot: false };
  }
  if (a.id === b.id || b.id === c.id || a.id === c.id) {
    return { reels, win: bet, jackpot: false };
  }
  return { reels, win: 0, jackpot: false };
}

export function drawSpin(bet: number, jackpot: number): SpinOutcome {
  return evaluateSpin([pickSymbol(), pickSymbol(), pickSymbol()], bet, jackpot);
}
