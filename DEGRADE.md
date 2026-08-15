# Degrade runbook — Saturday floor

The game is playable as long as the static files load. Everything else is a bonus.

## CDN / Vercel up, nothing else

Cards, photos, trivia, and battles still resolve on the phone. Tokens stay local until Supabase returns. Groq is off; templates show.

**Do:** keep playing. Do not reboot phones.

## Supabase down

Claims, wallet, leaderboard, and the live feed fail. Store says LOCAL ONLY or wallet errors.

**Do:** tell the floor tokens reset on refresh. Battles and trivia still work. Do not paste SQL or rotate keys mid-floor.

## Groq down or slow

`/api/verdict` returns `source: "template"` after 1200ms or a breaker trip. Winner is unchanged.

**Do:** nothing. The pre-scored compliment/roast is the product.

## Venue wifi blips

Battle/trivia/equip posts queue in IndexedDB and flush when the phone is back online. Same idempotency key, no double pay. Slots and chests need a live server roll — those just error; tap again.

**Do:** if a spin hangs, leave it. Do not mash OPEN.

## Load spike

`k6 run -e BASE=<url> -e VUS=50 scripts/load_k6.js` then `VUS=200`. That script only hits reads + `/api/me`. Do not load-test slots.

If p95 climbs, the read path (cards.json / photos) is still the cheap one. Kill Groq first (`GROQ_ENABLED=false` + restart) before touching Supabase.

## Order to shed load

1. Groq off
2. Stop the `/feed` TV poll if the monitor is optional
3. Keep `/` and `/data/*` — that is the game
