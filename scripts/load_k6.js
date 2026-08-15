/**
 * Floor load check. Read path + identity + board. Does not spin or open chests.
 *
 *   k6 run -e BASE=http://localhost:3000 scripts/load_k6.js
 *   k6 run -e BASE=http://localhost:3000 -e VUS=200 scripts/load_k6.js
 */
import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE || "http://localhost:3000";
const VUS = Number(__ENV.VUS || 50);

export const options = {
  scenarios: {
    floor: {
      executor: "constant-vus",
      vus: VUS,
      duration: "30s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<1500"],
  },
};

export default function floorLoad() {
  const me = http.get(`${BASE}/api/me`);
  check(me, { me: (r) => r.status === 200 });

  const board = http.get(`${BASE}/api/leaderboard`);
  check(board, { board: (r) => r.status === 200 });

  const cards = http.get(`${BASE}/data/cards.json`);
  check(cards, { cards: (r) => r.status === 200 });

  const questions = http.get(`${BASE}/data/questions.json`);
  check(questions, { questions: (r) => r.status === 200 });

  sleep(1);
}
