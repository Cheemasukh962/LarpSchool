# LARP EXPO GAME

**Your LinkedIn is the fighter.** A phone-first arcade floor game built for the [YC Startup Internship Expo](https://luma.com/yc-meetup-1244) at Dogpatch HQ, San Francisco (Aug 15, 2026).

795 confirmed guests. Pre-scored once. Then they walked in, searched their name, and fought.

Built by [Sukhman Cheema](https://www.linkedin.com/in/cheema-s).

---

Most expo “games” are a QR code and a leaderboard. This one ingested the actual guest list, pulled real LinkedIn profiles three different ways, ran a locked scoring rubric, and turned the room into a 16-bit fighting game — with tokens, slots, loot chests, and a live fight feed on the booth TV.

It is a joke about **online presence**, not a ranking of who can build. Everyone at that expo is a builder. The scores only see what LinkedIn sees.

> Built for your phone. Rankings are LinkedIn flex, not real talent. Play for fun. No cash value.

---

## The game

Two loops. One token wallet. New phone gets 3 tokens.

**LARP Battle** — Search the 795. Claim your card (or play as a walk-in guest). Pick a challenger. Scores stay hidden until you bet. The rubric decides the winner; you only call the side. Call it right, earn a token.

**YC trivia + slots / chest** — 133 questions generated from the 51 companies in the room. Correct answers pay. Slots and chests spend. Epic and legendary loot is rare; the reel still flashes gold so it *feels* close.

Also on the floor: `/join` QR, `/leaderboard`, `/feed` live fights, PWA cache so venue wifi can flake.

---

## How the data was built

The guest list started as a Luma dump (~1,348 going). Confirmed LinkedIn URLs became the source of truth: **`yc-expo-guests-linkedin-confirmed.csv` (795)**. Nobody fights unless they are on that list.

One vendor was never going to cover a room full of students, stealth founders, and private profiles. So the pipeline is three sources, merged on purpose.

### 1. Own scripts (the glue)

Before paying an enrich API, the project already had a custom pipeline:

- Match Luma guests to LinkedIn URLs (`yc-expo-guests-web-matched.csv` and the high-confidence cut)
- Download avatars (`scripts/download_linkedin_photos.py`)
- Score every card locally (`scripts/larp_engine.py` + `scripts/prescore_battlers.py`)
- Turn 51 company writeups into a 133-question bank (`scripts/generate_crossy_questions.py`)
- Pack the web payload (`scripts/build_web_data.py` + `scripts/build_photos.mjs`)

The scoring engine never hits the network. Pre-score is O(n). A fight is two numbers and a template. That is why 50 phones on bad wifi still feel instant.

### 2. Bright Data

`scripts/enrich_linkedin_brightdata.py` — LinkedIn Profiles dataset, batched, progress-tracked, key never written to disk.

Bright Data was the bulk pull: **~758 / 795** profiles landed. It is strong on **projects, posts, and photos** — the stuff a student profile actually has. It is weaker on intern job graphs, and **37** URLs came back hidden/private.

Those 37 were not faked. They went to the next source.

### 3. Crustdata

First a bakeoff (`scripts/crustdata_bakeoff.py`) against Bright Data successes *and* failures, including a known public exec and a garbage URL, so the merge rules were honest.

Then a targeted retry (`scripts/crustdata_retry_failed.py`): **32 / 37 recovered**. Crustdata wins on **jobs** (indexed person enrich). Live posts were not on this plan; remaining credits were not burned backfilling 700 empty-experience students.

Five URLs were still empty (bad slug, fully dark profiles). They stay on the confirmed list as guests, not invented LinkedIns.

**Merge rule:** Bright Data for presence / projects / photos. Crustdata for employment when Bright Data had nothing. Luma row for name and id. Then `prescore_battlers.py` writes `data/battlers.json`.

---

## Scoring (locked)

Python is the source of truth. TypeScript only resolves a matchup. `npm run test:parity` fights 200 random pairs against `larp_engine.battle()` and expects **zero** mismatches.

`flex_score` (0–100) wins the fight. `larp_index` is a roast badge, not the winner. Tie → lower larp index, then name.

| Bar | Cap | What it measures |
| --- | --- | --- |
| School | 32 | School field only. Never headline, never “MIT-licensed” in a project. |
| Work | 32 | FAANG-tier equals T0 school. Davis + Apple beats Berkeley + nothing. |
| Presence | 26 | Followers + personal site. |
| Projects | 10 | Last on purpose. Not everyone posts projects. |

School from the school field. Work from actual companies, not “Anthropic x Cerebral Valley alum” in a bio.

A fight is a **bet**, not a rewrite of the rubric. Groq (optional) only rewrites the roast prose. Kill the key and the game still plays; templates take over.

---

## Architecture

**Reads are static.** `cards.json` (795), `questions.json` (133), and 626 webp photos live on the CDN. Looking at a card or resolving a fight does not touch Postgres. That is how a booth stays cheap.

**Writes are a wallet.** Supabase holds `players`, `claims` (one LinkedIn card per phone cookie), and an append-only `ledger`. Slots and chests are rolled on the server. The phone only animates toward that result.

Identity is an httpOnly cookie (`ls_did`), not a login wall. Optional magic link if you switch phones. Walk-ins get a guest card with flex 0 — not a fake LinkedIn.

```
Luma guests
    → match LinkedIn (own scripts)
    → Bright Data enrich  (~758)
    → Crustdata retry     (32 of 37 failures)
    → larp_engine.py      (O(n) scores)
    → cards.json + photos (CDN)
    → Next.js floor game  (Vercel)
         ↘ Supabase wallet (claims, tokens, loot)
```

---

## Run it

```bash
npm install
cp .env.example .env   # Supabase + optional Groq. Never commit this.
npm run data           # rebuild cards.json + photos
npm run dev            # http://localhost:3000
npm test               # typecheck, lint, data, parity, gear, chest
```

Paste `supabase/schema.sql` (or `supabase/phase3.sql` on an existing project) into the Supabase SQL editor before expecting tokens to survive refresh.

Without keys the UI still works; claims and the wallet stay local until refresh.

---

## Stack

Next.js 15 · React 19 · Tailwind 4 · TypeScript · Supabase · Groq (flavor) · Vercel · PWA · k6

Python scores. Node serves. Postgres only remembers who played.

---

## Repo map

```
scripts/larp_engine.py              scoring + battle templates
scripts/prescore_battlers.py        run this after weight changes
scripts/enrich_linkedin_brightdata.py
scripts/crustdata_bakeoff.py
scripts/crustdata_retry_failed.py
scripts/download_linkedin_photos.py
scripts/generate_crossy_questions.py
lib/battle.ts                       parity-locked port of battle()
lib/game-store.tsx                  all client game state
app/api/                            claim, wallet, verdict, feed
supabase/                           identity + ledger
public/data/                        fight-ready JSON
public/photos/                      160px webp avatars
DEGRADE.md                          what to do when wifi / Groq / DB die
```

---

## Disclaimer

This was built for phones at a one-night expo. The ratings of ~795 people are **not** a measure of who they are as builders. They only depict **LinkedIn presence**. Everyone on that list is a great builder. The product is for enjoyment. Play-only. No cash value.
