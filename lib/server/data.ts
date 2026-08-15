import { readFileSync } from "node:fs";
import path from "node:path";

import type { Card, CardsPayload, Question, QuestionsPayload } from "@/lib/types";

let cards: Map<string, Card> | null = null;
let questions: Map<string, Question> | null = null;

function readPublic<T>(file: string): T {
  return JSON.parse(readFileSync(path.join(process.cwd(), "public", "data", file), "utf8")) as T;
}

export function cardById(id: string): Card | undefined {
  if (!cards) {
    const payload = readPublic<CardsPayload>("cards.json");
    cards = new Map(payload.cards.map((c) => [c.id, c]));
  }
  return cards.get(id);
}

export function questionById(id: string): Question | undefined {
  if (!questions) {
    const payload = readPublic<QuestionsPayload>("questions.json");
    questions = new Map(payload.questions.map((q) => [q.id, q]));
  }
  return questions.get(id);
}
