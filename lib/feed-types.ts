export interface FeedFight {
  at: string;
  betWon: boolean;
  playerName: string;
  winnerName: string;
  challengerName: string;
}

export interface FeedPayload {
  mode: "supabase" | "local";
  updatedAt: string;
  fights: FeedFight[];
}
