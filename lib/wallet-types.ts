import type { OwnedItem } from "./chest";

export interface WalletSpinResult {
  tokens: number;
  jackpot: number;
  bet: number;
  win: number;
  jackpotHit: boolean;
  reels: [string, string, string];
  replay: boolean;
}

export interface WalletChestResult {
  tokens: number;
  item: OwnedItem;
  inventory: OwnedItem[];
  replay: boolean;
}

export interface WalletBattleResult {
  tokens: number;
  battlesWon: number;
  betWon: boolean;
  replay: boolean;
}

export interface WalletTriviaResult {
  tokens: number;
  triviaCorrect: number;
  triviaAnswered: number;
  correct: boolean;
  replay: boolean;
}

export interface WalletEquipResult {
  inventory: OwnedItem[];
}
