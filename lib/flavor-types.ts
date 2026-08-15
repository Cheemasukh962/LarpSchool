export interface FlavorVerdict {
  headline: string;
  winner_compliment: string;
  loser_roast: string;
  tiebreak_note: string | null;
  source: "groq" | "template";
}

export interface VerdictRequest {
  winnerId: string;
  loserId: string;
  winnerName: string;
  loserName: string;
  winnerScore: number;
  loserScore: number;
  margin: number;
  photoFinish: boolean;
  tiebreak: "score" | "larp_index" | "name";
}
