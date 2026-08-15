"use client";

import { useMemo, useState } from "react";

import { searchCards, suggestedOpponents } from "@/lib/cards";
import { useGame } from "@/lib/game-store";
import { PixelBorder, pxS } from "../pixel";
import { CardRow } from "./CardRow";

/**
 * Browse opponents. With 795 fighters a flat list is unusable, so the default view is the
 * closest matchups by score and typing switches to a full-roster search.
 */
export function PickChallengerScreen() {
  const { data, playerCard, setBattleStep, chooseChallenger } = useGame();
  const [query, setQuery] = useState("");

  const list = useMemo(() => {
    if (!data || !playerCard) return [];
    if (query.trim()) return searchCards(data.cards, query, 40).filter((c) => c.id !== playerCard.id);
    return suggestedOpponents(data.cards, playerCard, 40);
  }, [data, playerCard, query]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-col gap-3 border-b border-[#ffd700]/20 bg-[#0a0a0a] px-5 py-3">
        <div className="flex items-center justify-between">
          <div style={pxS("7px")} className="text-[#ffd700]">
            CHALLENGERS
          </div>
          <button
            onClick={() => setBattleStep("challenger-select")}
            style={pxS("6px")}
            className="text-white/30 transition hover:text-white"
          >
            ← BACK
          </button>
        </div>
        <PixelBorder>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="SEARCH ALL FIGHTERS"
            maxLength={40}
            className="w-full bg-[#0a0a0a] px-3 py-2 uppercase tracking-wider text-[#ffd700] placeholder:text-[#ffd700]/25 focus:outline-none"
            style={pxS("6px")}
          />
        </PixelBorder>
        {!query.trim() && (
          <div style={pxS("4px")} className="text-white/25">
            CLOSE FIGHTS FIRST · SCORES HIDDEN UNTIL YOU BATTLE
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {list.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <div className="text-4xl opacity-25">🔍</div>
            <div style={pxS("6px")} className="leading-loose text-white/25">
              NO FIGHTER FOUND
            </div>
          </div>
        ) : (
          list.map((card) => <CardRow key={card.id} card={card} hideScore onSelect={chooseChallenger} />)
        )}
      </div>
    </div>
  );
}
