"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { rankedOpponents, searchCards } from "@/lib/cards";
import { useGame } from "@/lib/game-store";
import { PixelBorder, pxS } from "../pixel";
import { CardRow } from "./CardRow";

/** One phone screen of rows. Paging keeps 795 photos from mounting at once. */
const PAGE_SIZE = 20;

/**
 * Browse opponents. Close fights first, then NEXT for the rest of the roster.
 * Search jumps to a name without walking every page.
 */
export function PickChallengerScreen() {
  const { data, playerCard, setBattleStep, chooseChallenger } = useGame();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const roster = useMemo(() => {
    if (!data || !playerCard) return [];
    if (query.trim()) return searchCards(data.cards, query, data.cards.length).filter((c) => c.id !== playerCard.id);
    return rankedOpponents(data.cards, playerCard);
  }, [data, playerCard, query]);

  const pageCount = Math.max(1, Math.ceil(roster.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const from = safePage * PAGE_SIZE;
  const visible = roster.slice(from, from + PAGE_SIZE);

  useEffect(() => {
    setPage(0);
  }, [query]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
  }, [safePage, query]);

  const go = (next: number) => {
    setPage(Math.max(0, Math.min(pageCount - 1, next)));
  };

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
            CLOSE FIGHTS FIRST · NEXT FOR MORE
          </div>
        )}
      </div>

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {roster.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <div className="text-4xl opacity-25">🔍</div>
            <div style={pxS("6px")} className="leading-loose text-white/25">
              NO FIGHTER FOUND
            </div>
          </div>
        ) : (
          visible.map((card) => <CardRow key={card.id} card={card} hideScore onSelect={chooseChallenger} />)
        )}
      </div>

      {roster.length > 0 && (
        <div className="flex shrink-0 items-center gap-3 border-t border-[#ffd700]/20 bg-[#0a0a0a] px-5 py-3">
          <button
            type="button"
            disabled={safePage === 0}
            onClick={() => go(safePage - 1)}
            className="flex-1 border-2 border-[#ffd700]/40 py-3 text-white/60 transition hover:border-[#ffd700] hover:text-white disabled:border-[#ffd700]/15 disabled:text-white/15"
            style={pxS("6px")}
          >
            PREV
          </button>
          <div style={pxS("5px")} className="shrink-0 text-center text-[#ffd700]/70">
            {from + 1}–{from + visible.length}
            <br />
            OF {roster.length}
          </div>
          <button
            type="button"
            disabled={safePage >= pageCount - 1}
            onClick={() => go(safePage + 1)}
            className="flex-1 py-3 text-[#0a0a0a] disabled:bg-[#ffd700]/20 disabled:text-[#0a0a0a]/40"
            style={{
              ...pxS("6px"),
              background: safePage >= pageCount - 1 ? undefined : "#ffd700",
              boxShadow: safePage >= pageCount - 1 ? undefined : "3px 3px 0 #b8860b",
            }}
          >
            NEXT
          </button>
        </div>
      )}
    </div>
  );
}
