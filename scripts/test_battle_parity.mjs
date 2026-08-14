/**
 * Assert lib/battle.ts resolves matchups identically to scripts/larp_engine.py.
 *
 * Also doubles as a check that build_web_data.py copied the fight-relevant fields
 * verbatim, since the TS side reads the derived cards.json and Python reads battlers.json.
 *
 * Run: npm run test:parity
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { resolveBattle } from "../lib/battle.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const PAIR_COUNT = 200;

/** Deterministic PRNG so a failure is always reproducible. */
function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const { cards } = JSON.parse(readFileSync(path.join(ROOT, "public/data/cards.json"), "utf8"));
const byId = new Map(cards.map((c) => [c.id, c]));

const rand = lcg(20260815);
const pairs = [];

// Bias toward close matchups: those exercise the tie-breakers, which is where a port drifts.
const sorted = [...cards].sort((x, y) => x.flex_score - y.flex_score);
for (let i = 0; i < PAIR_COUNT / 2; i++) {
  const idx = Math.floor(rand() * (sorted.length - 1));
  pairs.push([sorted[idx].id, sorted[idx + 1].id]);
}
while (pairs.length < PAIR_COUNT) {
  const a = cards[Math.floor(rand() * cards.length)];
  const b = cards[Math.floor(rand() * cards.length)];
  if (a.id !== b.id) pairs.push([a.id, b.id]);
}

const dir = mkdtempSync(path.join(tmpdir(), "larp-parity-"));
const pairsFile = path.join(dir, "pairs.json");
const outFile = path.join(dir, "out.json");
writeFileSync(pairsFile, JSON.stringify(pairs), "utf8");

execFileSync("python", [path.join(ROOT, "scripts/_parity_python.py"), pairsFile, outFile], {
  stdio: "inherit",
});
const pyResults = JSON.parse(readFileSync(outFile, "utf8"));

const compared = ["winner_id", "loser_id", "winner_score", "loser_score", "margin", "verdict"];
let failures = 0;
let ties = 0;

pairs.forEach(([aId, bId], i) => {
  const ts = resolveBattle(byId.get(aId), byId.get(bId));
  const py = pyResults[i];
  if (ts.margin === 0) ties++;

  for (const field of compared) {
    if (ts[field] !== py[field]) {
      failures++;
      if (failures <= 5) {
        console.error(`\nMISMATCH pair ${i} (${aId} vs ${bId}) field "${field}"`);
        console.error(`  python: ${JSON.stringify(py[field])}`);
        console.error(`  ts:     ${JSON.stringify(ts[field])}`);
      }
      break;
    }
  }
});

console.log(`\npairs=${pairs.length} exact_score_ties=${ties} mismatches=${failures}`);
if (failures) {
  console.error("PARITY FAILED");
  process.exit(1);
}
console.log("PARITY OK - lib/battle.ts matches larp_engine.battle()");
