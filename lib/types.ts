/** Shapes emitted by scripts/build_web_data.py. Keep in sync with that script. */

export type SchoolTier = "T0" | "T1" | "T2" | "HS" | "none";

export interface Breakdown {
  school: number;
  work: number;
  presence: number;
  projects: number;
}

/** One fight-ready guest. Everything the UI needs, nothing it doesn't. */
export interface Card {
  id: string;
  name: string;
  initials: string;
  slug: string;
  linkedin: string;
  school: string;
  school_tier: SchoolTier;
  company: string;
  title: string;
  flex_score: number;
  larp_index: number;
  rank: number;
  followers: number;
  breakdown: Breakdown;
  tags: string[];
  highlights: string[];
  described_projects: number;
  top_project: string;
  compliment: string;
  roast: string;
  has_photo: boolean;
}

export interface CardsPayload {
  count: number;
  scoring: Record<string, string>;
  cards: Card[];
}

export interface Question {
  id: string;
  company: string;
  initial: string;
  color: string;
  bg: string;
  tagline: string;
  kind: string;
  question: string;
  options: string[];
  correct: number;
  explain: string;
}

export interface QuestionsPayload {
  count: number;
  questions: Question[];
}

export interface BattleResult {
  winner_id: string;
  loser_id: string;
  winner_name: string;
  loser_name: string;
  winner_score: number;
  loser_score: number;
  margin: number;
  /** Full prose, kept byte-identical to the Python engine for parity and for recording. */
  verdict: string;
  /** Just the scoreline sentence, so the UI can show it without repeating the two lines below. */
  headline: string;
  winner_compliment: string;
  loser_roast: string;
  /** True when the score gap is small enough that Groq is allowed to judge (Phase 4). */
  photo_finish: boolean;
  /** What actually separated them, so a 0-margin result can explain itself on screen. */
  tiebreak: "score" | "larp_index" | "name";
  /** Which side of the fight the player was on, when known. */
  player_won?: boolean;
}
