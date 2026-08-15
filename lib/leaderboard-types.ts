export interface LeaderRow {
  rank: number;
  name: string;
  initials: string;
  battlesWon: number;
  tokens: number;
  guest: boolean;
  you: boolean;
}

export interface LeaderboardPayload {
  mode: "supabase" | "local";
  updatedAt: string;
  rows: LeaderRow[];
}
