/**
 * Loads and queries the precomputed guest cards.
 *
 * Both payloads are static files on the CDN, fetched once per session. No database is
 * involved in reading a card or resolving a fight, which is what keeps the read path
 * flat under load and lets Phase 5 cache the whole thing for offline play.
 */
import type { Card, CardsPayload, Question, QuestionsPayload } from "./types";

export interface GameData {
  cards: Card[];
  byId: Map<string, Card>;
  questions: Question[];
  scoring: Record<string, string>;
}

let cache: Promise<GameData> | null = null;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  return (await res.json()) as T;
}

export function loadGameData(): Promise<GameData> {
  cache ??= (async () => {
    const [cardsPayload, questionsPayload] = await Promise.all([
      fetchJson<CardsPayload>("/data/cards.json"),
      fetchJson<QuestionsPayload>("/data/questions.json"),
    ]);
    return {
      cards: cardsPayload.cards,
      byId: new Map(cardsPayload.cards.map((c) => [c.id, c])),
      questions: questionsPayload.questions,
      scoring: cardsPayload.scoring,
    };
  })().catch((err) => {
    // Never poison the cache with a failed load; a retry should be able to succeed.
    cache = null;
    throw err;
  });
  return cache;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Name-first search. Someone at a booth is typing their own name or a friend's, so an
 * exact prefix on a name part should always beat a mention of their school.
 */
export function searchCards(cards: Card[], query: string, limit = 25): Card[] {
  const q = normalize(query.trim());
  if (!q) return [];

  const scored: Array<{ card: Card; score: number }> = [];
  for (const card of cards) {
    const name = normalize(card.name);
    let score = 0;

    if (name === q) score = 100;
    else if (name.startsWith(q)) score = 80;
    else if (name.split(/\s+/).some((part) => part.startsWith(q))) score = 60;
    else if (name.includes(q)) score = 40;
    else if (normalize(card.company).includes(q)) score = 20;
    else if (normalize(card.school).includes(q)) score = 10;

    if (score > 0) {
      // Break ties by rank so the recognizable names surface first.
      scored.push({ card, score: score * 1000 - Math.min(card.rank, 999) });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.card);
}

export function randomCard(cards: Card[], excludeId?: string): Card {
  if (cards.length === 0) throw new Error("no cards loaded");
  for (let i = 0; i < 12; i++) {
    const pick = cards[Math.floor(Math.random() * cards.length)];
    if (pick.id !== excludeId) return pick;
  }
  return cards.find((c) => c.id !== excludeId) ?? cards[0];
}

/**
 * Opponents worth fighting, weighted toward close matchups but never only ties.
 *
 * Scores cluster hard: in a random sample of 200 pairs, 90 had identical totals. Taking the
 * N smallest gaps would therefore serve a list of guaranteed dead heats, every one decided
 * by an invisible tiebreak. Sampling the gap-sorted pool on a quadratic curve keeps the
 * closest fight first while still reaching real blowouts further down.
 */
export function suggestedOpponents(cards: Card[], player: Card, count = 12): Card[] {
  const pool = cards
    .filter((c) => c.id !== player.id)
    .map((c) => ({ c, gap: Math.abs(c.flex_score - player.flex_score) }))
    .sort((a, b) => a.gap - b.gap || a.c.rank - b.c.rank);

  if (pool.length <= count) return pool.map((x) => x.c);

  const picked: Card[] = [];
  const used = new Set<number>();
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1);
    let idx = Math.round(t * t * (pool.length - 1));
    while (used.has(idx) && idx < pool.length - 1) idx++;
    if (used.has(idx)) continue;
    used.add(idx);
    picked.push(pool[idx].c);
  }
  return picked;
}

/** Fisher-Yates over indices so the trivia deck never repeats until exhausted. */
export function shuffledDeck(size: number): number[] {
  const deck = Array.from({ length: size }, (_, i) => i);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
