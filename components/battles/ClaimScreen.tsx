"use client";

import { useMemo, useState } from "react";

import { searchCards } from "@/lib/cards";
import { useGame } from "@/lib/game-store";
import { MiniFighters, PixelBorder, PixelStripe, TokenPill, pxS } from "../pixel";
import { CardRow } from "./CardRow";

/**
 * Claim your card. The design's "ENTER YOUR NAME" prompt now searches the 795 confirmed
 * guests instead of inventing a persona, because the whole point is that your real
 * LinkedIn is the fighter.
 */
export function ClaimScreen() {
  const { data, tokens, claimCard, enterGuest, claimError, setBattleStep } = useGame();
  const [query, setQuery] = useState("");

  const results = useMemo(() => searchCards(data?.cards ?? [], query, 30), [data, query]);
  const searching = query.trim().length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <PixelStripe />
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 pt-8 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div style={pxS("6px")} className="text-[#ffd700]">
                PLAYER 1
              </div>
              <div className="h-2 w-2 rounded-sm bg-[#ffd700]" style={{ animation: "pulse 1s infinite" }} />
            </div>
            <div style={pxS("14px")} className="leading-snug text-white">
              FIND
              <br />
              YOUR CARD
            </div>
          </div>
          <TokenPill tokens={tokens} size="8px" icon={13} />
        </div>

        <div className="flex flex-col gap-3">
          <PixelBorder gold>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="TYPE YOUR NAME"
              maxLength={40}
              autoFocus
              className="w-full bg-[#0a0a0a] px-4 py-3 uppercase tracking-wider text-[#ffd700] placeholder:text-[#ffd700]/25 focus:outline-none"
              style={pxS("8px")}
            />
          </PixelBorder>
          <div style={pxS("5px")} className="leading-loose text-white/25">
            {data ? `${data.cards.length} FIGHTERS ON THE GUEST LIST` : "LOADING GUEST LIST..."}
          </div>
          {claimError && (
            <div style={pxS("5px")} className="leading-loose text-[#ef4444]">
              {claimError.toUpperCase()}
            </div>
          )}
        </div>

        {searching ? (
          <div className="-mx-6 flex flex-col">
            {results.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                <div className="text-4xl opacity-25">🔍</div>
                <div style={pxS("6px")} className="leading-loose text-white/25">
                  NO MATCH
                  <br />
                  NOT ON THE LIST?
                </div>
                <button
                  onClick={() => enterGuest(query.trim())}
                  className="mt-2 px-5 py-3 text-[#0a0a0a]"
                  style={{ ...pxS("6px"), background: "#ffd700", boxShadow: "3px 3px 0 #b8860b" }}
                >
                  PLAY AS GUEST
                </button>
              </div>
            ) : (
              results.map((card) => <CardRow key={card.id} card={card} onSelect={claimCard} />)
            )}
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 pb-2">
            <MiniFighters />
            <div className="flex w-full">
              {Array.from({ length: 49 }).map((_, i) => (
                <div key={i} style={{ width: 8, height: 4, background: i % 2 === 0 ? "#ffd700" : "#0a0a0a" }} />
              ))}
            </div>
            <div style={pxS("6px")} className="text-center leading-loose text-white/25">
              YOUR LINKEDIN IS
              <br />
              ALREADY SCORED
            </div>
            <div style={pxS("5px")} className="text-center leading-loose text-white/20">
              WALK-IN? TYPE A NAME
              <br />
              THEN PLAY AS GUEST
            </div>
            <button
              onClick={() => setBattleStep("type-select")}
              style={pxS("6px")}
              className="text-white/30 transition hover:text-white"
            >
              ← BACK
            </button>
          </div>
        )}
      </div>
      <PixelStripe flip />
    </div>
  );
}
