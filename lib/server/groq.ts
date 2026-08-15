import { pairKey } from "@/lib/battle";
import { guestCard, isGuestId } from "@/lib/adapt";
import type { FlavorVerdict, VerdictRequest } from "@/lib/flavor-types";
import type { Card } from "@/lib/types";

import { cardById } from "./data";

export const GROQ_TIMEOUT_MS = 1200;
const FAIL_OPEN_AFTER = 3;
const BREAKER_MS = 30_000;
const CACHE_MAX = 400;

const cache = new Map<string, FlavorVerdict>();
let fails = 0;
let openUntil = 0;

function groqKeys(): string[] {
  return [process.env.GROQ_API_KEY, process.env.GROQ_API_KEY_FALLBACK]
    .map((k) => k?.trim())
    .filter((k): k is string => Boolean(k));
}

export function isGroqEnabled(): boolean {
  const flag = (process.env.GROQ_ENABLED ?? "").trim().toLowerCase();
  const on = flag === "1" || flag === "true" || flag === "yes";
  return on && groqKeys().length > 0;
}

export function groqStatus(): { enabled: boolean; open: boolean } {
  return { enabled: isGroqEnabled(), open: Date.now() < openUntil };
}

function cacheKey(req: VerdictRequest): string {
  const lo = Math.min(req.winnerScore, req.loserScore);
  const hi = Math.max(req.winnerScore, req.loserScore);
  return `${pairKey(req.winnerId, req.loserId)}:${lo}:${hi}`;
}

function remember(key: string, value: FlavorVerdict): FlavorVerdict {
  if (cache.size >= CACHE_MAX) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  cache.set(key, value);
  return value;
}

function fighter(id: string, name: string): Card {
  if (isGuestId(id)) return guestCard(name, id);
  return cardById(id) ?? guestCard(name, id);
}

function templateFor(req: VerdictRequest): FlavorVerdict {
  const winner = fighter(req.winnerId, req.winnerName);
  const loser = fighter(req.loserId, req.loserName);
  const tone =
    req.margin >= 20 ? "it was not close" : req.margin >= 8 ? "a clean hit" : "a photo-finish between two LinkedIn mains";
  const headline = `${req.winnerName} beats ${req.loserName} ${req.winnerScore}-${req.loserScore} — ${tone}.`;
  const tiebreak_note =
    req.margin === 0
      ? req.tiebreak === "larp_index"
        ? "Same score. Lower LARP index takes it."
        : "Same score. Split on name order."
      : null;
  return {
    headline,
    winner_compliment: winner.compliment,
    loser_roast: loser.roast,
    tiebreak_note,
    source: "template",
  };
}

function allowCall(): boolean {
  return Date.now() >= openUntil;
}

function recordOk(): void {
  fails = 0;
}

function recordFail(): void {
  fails += 1;
  if (fails >= FAIL_OPEN_AFTER) {
    openUntil = Date.now() + BREAKER_MS;
    fails = 0;
  }
}

interface GroqJson {
  headline?: unknown;
  winner_compliment?: unknown;
  loser_roast?: unknown;
  tiebreak_note?: unknown;
}

function asLine(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const text = value.replace(/\s+/g, " ").trim();
  if (!text || text.length > 280) return fallback;
  return text;
}

export async function flavorFor(req: VerdictRequest): Promise<FlavorVerdict> {
  const key = cacheKey(req);
  const hit = cache.get(key);
  if (hit) return hit;

  const fallback = templateFor(req);
  if (!isGroqEnabled() || !allowCall()) return fallback;

  const winner = fighter(req.winnerId, req.winnerName);
  const loser = fighter(req.loserId, req.loserName);
  const model = process.env.GROQ_MODEL?.trim() || "llama-3.1-8b-instant";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);
  const payload = {
    model,
    temperature: 0.6,
    max_tokens: 220,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You write short LinkedIn roasts for a floor game. The winner is already decided by a score. Never change who won or invent a different score. JSON only.",
      },
      {
        role: "user",
        content: JSON.stringify({
          winner: {
            name: req.winnerName,
            score: req.winnerScore,
            school: winner.school,
            company: winner.company,
            compliment: winner.compliment,
          },
          loser: {
            name: req.loserName,
            score: req.loserScore,
            school: loser.school,
            company: loser.company,
            roast: loser.roast,
          },
          margin: req.margin,
          photo_finish: req.photoFinish,
          tiebreak: req.tiebreak,
          need:
            "headline: one sentence scoreline that keeps these names and numbers. winner_compliment: one punchy sentence. loser_roast: one punchy sentence. tiebreak_note: if photo_finish or margin is 0, one short reason the winner edged it; else null.",
        }),
      },
    ],
  };

  try {
    let res: Response | null = null;
    for (const apiKey of groqKeys()) {
      res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) break;
      if (res.status !== 401 && res.status !== 403 && res.status !== 402 && res.status !== 429) break;
    }

    if (!res || !res.ok) {
      recordFail();
      return fallback;
    }

    const body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = body.choices?.[0]?.message?.content;
    if (!raw) {
      recordFail();
      return fallback;
    }

    const parsed = JSON.parse(raw) as GroqJson;
    const flavor: FlavorVerdict = {
      headline: asLine(parsed.headline, fallback.headline),
      winner_compliment: asLine(parsed.winner_compliment, fallback.winner_compliment),
      loser_roast: asLine(parsed.loser_roast, fallback.loser_roast),
      tiebreak_note: req.photoFinish || req.margin === 0
        ? asLine(parsed.tiebreak_note, fallback.tiebreak_note ?? "") || fallback.tiebreak_note
        : null,
      source: "groq",
    };

    if (!flavor.headline.includes(String(req.winnerScore)) || !flavor.headline.toLowerCase().includes(req.winnerName.split(" ")[0].toLowerCase())) {
      return fallback;
    }

    recordOk();
    return remember(key, flavor);
  } catch {
    recordFail();
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}
