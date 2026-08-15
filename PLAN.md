# LarpSchool — build plan and handoff

**Read `context.txt` first, then this file.** `context.txt` is product/scoring/data truth. This file is the engineering plan, what shipped, and what to do next.

Event is **Saturday Aug 15, 2026** (tomorrow if you are reading this on Aug 14). Dogpatch HQ, SF. Floor game for ~50 concurrent players. Confirmed fighters: **795**.

Repo: https://github.com/Cheemasukh962/LarpSchool.git  
Owner: Sukhman Cheema. Do not invent product decisions that contradict `context.txt`.

---

## Status as of 2026-08-14 (handoff)

| Phase | Name | Status |
| --- | --- | --- |
| 0 | Scaffold Next.js + reshape data for the web | **DONE** |
| 1 | Wire real guests, four-bar scorecards, real verdicts, 133 trivia Qs. Split the 1129-line mock into files. Zero writes. | **DONE** |
| 2 | Supabase identity: claims, httpOnly cookie, guest mode, optional magic-link | **CODE LANDED — needs your Supabase project** |
| 3 | Server-authoritative tokens, ledger, slot/chest RNG | pending |
| 4 | Groq roast prose + photo-finish judge (flavor only) | pending |
| 5 | Load hardening (PWA, write queue, k6, degrade runbook) | pending |
| 6 | Booth ops (leaderboard, QR, live fight feed, first-time grant) | pending |

The UI runs locally with real data. Tokens, inventory, and claimed cards are still **in-memory React state**. Refresh loses everything. That is expected until Phase 2/3.

Run: `npm install && npm run data && npm run dev` then open http://localhost:3000  
Verify: `npm test` then (with dev server up) `npm run test:flow`

---

## Architecture (do not undo)

**Read path is static.** Cards, questions, and 160px WebP photos live on the Vercel CDN. A fight is a pure client function over two pre-scored cards. Postgres is for writes only (claims, wallet, battle records). This is how 50 concurrent players stay cheap.

**Python scores. TypeScript only resolves matchups.** `scripts/larp_engine.py` is the source of truth for weights. `lib/battle.ts` must stay parity-locked (`npm run test:parity`, 200 pairs, 0 mismatches). Do not reimplement scoring in JS.

**The 1129-line mock is split. Do not re-merge it.** Original lives in `frontend/` (excluded from the Next build). Live tree:

```
app/                  layout (next/font CSS vars), page, globals.css, icon.svg
lib/types.ts          shapes from scripts/build_web_data.py
lib/battle.ts         port of larp_engine.battle()
lib/cards.ts          load, search, matchmaking, trivia deck
lib/adapt.ts          card → UI (gradients, identity lines, photo URL, bars)
lib/slots.ts          symbol table + payout math (RNG moves to server in Phase 3)
lib/chest.ts          loot table + reel geometry (same)
lib/game-store.tsx    ALL game state. Phase 2/3 swap persistence here.
components/pixel/     design primitives
components/LarpGame.tsx
components/battles/   one file per screen
components/rewards/
components/store/
```

**Fonts** are self-hosted via `next/font/google` as `--font-press-start` / `--font-space-mono`. Components use `pxS()` / `monoS()` from `components/pixel/tokens.ts`. Do not go back to a Google Fonts `<link>`.

---

## Locked product decisions

- Two loops, one wallet: **LARP battle** (people vs people) and **trivia + slots/chest** (company intel as quiz). No student-vs-company Groq fights.
- Confirmed guests only (`yc-expo-guests-linkedin-confirmed.csv`, 795). Walk-ins in Phase 2 get a guest card, not a fake LinkedIn.
- `flex_score` decides the winner. `larp_index` is a roast badge. Tie → lower larp_index, then name.
- Bars: School 32 / Work 32 / Presence 26 / Projects 10. FAANG work equals T0 school. Davis+Apple beats Berkeley+nothing. School from the **school field only**.
- Face-off tap is a **prediction**. The rubric decides. Result screen says CALLED IT / WRONG CALL.
- Tokens: +1 per resolved fight (once, in the store — the mock paid on every result button). +1 per correct trivia. Slots/chest spend tokens. Play-only, no cash value.
- Groq is Phase 4 flavor. Removing `GROQ_ENABLED` / the key must change nothing but prose. Score still decides.
- Do not fold in the Nowadays dining challenge.

Scores cluster: **90 of 200 random pairs tie on flex_score.** `suggestedOpponents()` samples the gap-sorted pool on a quadratic curve so the list is close fights first without being all dead heats. A 0-margin result shows DEAD HEAT and the tiebreak (`larp_index` or name). Phase 4 Groq replaces that explanation on photo-finishes (margin < 5).

---

## Phase 0 (done)

- Next.js 15 App Router, React 19, Tailwind 4, TypeScript, lucide-react on branch `build`.
- `scripts/build_web_data.py` → `public/data/cards.json` (795, ~64KB brotli), `public/data/questions.json` (133), `data/web/battlers-full.json` (Phase 2 seed).
- `scripts/build_photos.mjs` (sharp) → `public/photos/{lumaId}.webp`, 160px, 626 files, ~1.81MB.
- `cards.json` is 557KB raw. Compressed it is fine as one fetch. Do not split it.

## Phase 1 (done)

- Real claim-by-name search over 795 guests. Profile four-bar scorecard. Real photos with initials fallback.
- Battle resolution via `lib/battle.ts`. Result: winner/loser, margin, headline, compliment, roast, compare bars, prediction badge.
- Trivia: full 133-question shuffled deck. Never show `question.kind` (`trap` would leak).
- Mock split into the file tree above. `LarpBattleFlow.tsx` deleted.
- Tests: `test:data`, `test:parity`, `test:flow` (Chrome via puppeteer-core).

## Phase 2 — identity (code is in the repo)

Goal: claiming a card survives refresh and a second device can be a different player.

**You still have to create the Supabase project.** Until `.env` has keys, the game runs in `local` mode (same as Phase 1: refresh wipes state).

1. Create a Supabase project. Copy URL + service role + anon key into `.env` (see `.env.example`).
2. Use the **transaction pooler** connection string in the dashboard if you add a direct Postgres client later. The JS client uses the URL + service role.
3. Paste `supabase/schema.sql` into the SQL editor and run it.
4. Auth: add Redirect URL `https://<your-domain>/api/auth/callback` (and localhost for dev). Email template should land on that route with `token_hash`.
5. Restart `npm run dev`. Store tab should say SAVED ON THIS PHONE instead of LOCAL ONLY.

What the code already does:
- `ls_did` httpOnly cookie
- `POST /api/claim` — one live claim per battler, one per phone
- `POST /api/guest` — walk-in with flex 0, not a fake LinkedIn
- `POST /api/state` — tokens + inventory debounce-save
- Magic link merge via `POST /api/auth/magic` + `/api/auth/callback`

Keep `lib/game-store.tsx` as the client API. Screens should not grow fetch logic.

## Phase 3 — economy

- Wallet in Postgres. Append-only ledger. Idempotency keys on every spin/chest/battle credit.
- Atomic RPCs so two tabs cannot double-spend.
- Server RNG for slots and chest. Client keeps `lib/slots.ts` / `lib/chest.ts` tables so the reel animates toward a result the server already chose.
- Per-player rate limits.
- The mock token-per-tap bug is already fixed client-side; do not reintroduce it when wiring the API.

## Phase 4 — Groq (flavor)

- Winner is still the score. Groq narrates, and on `photo_finish` (margin < 5) may pick the tiebreak **only if** `GROQ_ENABLED` and the call returns inside **1200ms**.
- Cache by `pairKey(a,b)` so the same pairing always gets the same prose.
- Circuit breaker: after failures, fall back to templates (`verdict` / `headline` already in `lib/battle.ts`).
- Kill switch: no key ⇒ identical gameplay, templates only.

## Phase 5 — load

- PWA cache of `/data/*` and `/photos/*`.
- IndexedDB queue for writes if the network blips on venue wifi.
- k6 at 50 and 200 concurrent. Degrade runbook per dependency (Supabase down, Groq down, CDN ok).

## Phase 6 — booth

- Leaderboard screen, QR entry onto a phone, big-screen live fight feed, first-time token grant.
- Cover already shows `FIGHTERS 000795`; a live hi-score can replace the old mock `004800`.

---

## How to run and test

```
npm install
npm run data          # rebuild cards.json + photos from Python + sharp
npm run dev
npm test              # typecheck + lint + test:data + test:parity
npm run test:flow     # needs dev server; --url --shots --headful
```

`next lint` is deprecated; `npm run lint` is `eslint .` with `eslint.config.mjs`.

Do not add `"type": "module"` to `package.json` just to silence the Node warning when importing `.ts` from the test scripts — Next still needs the current package shape.

---

## Secrets — never commit

`.gitignore` already blocks `.env`. Keys were pasted in earlier chats. They are **not** in this repo. Rotate if still live.

- `BRIGHTDATA_API_KEY` / `BRIGHTDATA_API_TOKEN` — enrich already done; do not spend remaining credits backfilling.
- `CRUSTDATA_API_KEY` — same.
- Groq — Phase 4 only.
- Supabase URL/service role — Phase 2. Service role stays server-only.

---

## Do not

- Re-merge the game into one 1000-line component.
- Re-score in TypeScript. Change `larp_engine.py`, run `python scripts/prescore_battlers.py`, then `npm run data && npm test`.
- Pass the whole profile blob into `school_tier()` (false-positive “MIT-licensed”).
- Show `question.kind` on trivia.
- Credit tokens on every result-screen button.
- Start Groq per fight before Phase 4.
- Start the Nowadays dining app until this floor loop works.
- Commit `.env`, `node_modules`, `.screens/`, or `data/web/`.
