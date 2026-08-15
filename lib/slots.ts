/**
 * Slot symbols and payout rules, lifted out of the mock component.
 *
 * Symbol table + payout math. When Supabase is on, the server draws and the client
 * only animates toward that result. Local mode still calls drawSpin() here.
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

export function pickSymbol(luck = 0): SlotSymbol {
  const tilt = Math.max(0, Math.min(20, luck));
  const weights = SLOT_SYMBOLS.map((s, i) => {
    if (i === 0) return Math.max(8, s.prob - tilt * 1.2);
    if (s.id === "star" || s.id === "crown") return s.prob + tilt * 0.5;
    return s.prob + tilt * 0.2;
  });
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < SLOT_SYMBOLS.length; i++) {
    r -= weights[i];
    if (r <= 0) return SLOT_SYMBOLS[i];
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

export function drawSpin(bet: number, jackpot: number, luck = 0): SpinOutcome {
  return evaluateSpin([pickSymbol(luck), pickSymbol(luck), pickSymbol(luck)], bet, jackpot);
}
