import type { OwnedItem } from "./chest";
import { JACKPOT_SEED } from "./slots";

export interface SessionSnapshot {
  mode: "supabase" | "local";
  playerId: string | null;
  battlerId: string | null;
  isGuest: boolean;
  displayName: string | null;
  email: string | null;
  tokens: number;
  jackpot: number;
  battlesWon: number;
  triviaCorrect: number;
  triviaAnswered: number;
  inventory: OwnedItem[];
  hasAuth: boolean;
}

export function localSnapshot(): SessionSnapshot {
  return {
    mode: "local",
    playerId: null,
    battlerId: null,
    isGuest: false,
    displayName: null,
    email: null,
    tokens: 3,
    jackpot: JACKPOT_SEED,
    battlesWon: 0,
    triviaCorrect: 0,
    triviaAnswered: 0,
    inventory: [],
    hasAuth: false,
  };
}
