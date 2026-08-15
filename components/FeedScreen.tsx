"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Swords } from "lucide-react";

import type { FeedPayload } from "@/lib/feed-types";
import { PixelBorder, pxS } from "@/components/pixel";

const POLL_MS = 3000;

export function FeedScreen() {
  const [feed, setFeed] = useState<FeedPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const pull = () => {
      fetch("/api/feed", { cache: "no-store" })
        .then((res) => {
          if (!res.ok) throw new Error(`feed ${res.status}`);
          return res.json() as Promise<FeedPayload>;
        })
        .then((data) => {
          if (!alive) return;
          setFeed(data);
          setError(null);
        })
        .catch((err) => {
          if (alive) setError(err instanceof Error ? err.message : String(err));
        });
    };
    pull();
    const iv = setInterval(pull, POLL_MS);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-[#0a0a0a] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(#ffd700 1px,transparent 1px),linear-gradient(90deg,#ffd700 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="relative z-10 flex items-center justify-between border-b border-[#ffd700]/20 px-8 py-5">
        <div className="flex items-center gap-3 text-[#ffd700]">
          <Swords size={22} />
          <span style={pxS("14px")}>LIVE FIGHTS</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/join" style={pxS("7px")} className="text-[#ffd700]/70">
            QR
          </Link>
          <Link href="/leaderboard" style={pxS("7px")} className="text-[#ffd700]/70">
            BOARD
          </Link>
          <div style={pxS("6px")} className="text-white/30">
            {feed?.updatedAt ? new Date(feed.updatedAt).toLocaleTimeString() : "—"}
          </div>
        </div>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-8 py-6">
        {error && (
          <div style={pxS("8px")} className="mb-4 text-[#ef4444]">
            {error.toUpperCase()}
          </div>
        )}
        {feed?.mode === "local" && (
          <div style={pxS("8px")} className="text-white/35">
            FEED NEEDS SUPABASE
          </div>
        )}
        {feed && feed.fights.length === 0 && feed.mode === "supabase" && (
          <div style={pxS("8px")} className="text-white/35">
            WAITING FOR THE FIRST BET
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {feed?.fights.map((fight, i) => (
            <PixelBorder key={`${fight.at}-${i}`} gold={i === 0} className="w-full">
              <div className="flex items-center justify-between gap-4 bg-[#0a0a0a] px-5 py-4">
                <div className="min-w-0">
                  <div style={pxS("8px")} className="truncate text-white">
                    {fight.playerName.toUpperCase()}
                  </div>
                  <div style={pxS("5px")} className="mt-2 text-white/35">
                    {fight.winnerName.toUpperCase()} BEAT {fight.challengerName.toUpperCase()}
                  </div>
                </div>
                <div style={pxS("8px")} className={fight.betWon ? "text-[#22c55e]" : "text-[#ef4444]"}>
                  {fight.betWon ? "HIT" : "MISS"}
                </div>
              </div>
            </PixelBorder>
          ))}
        </div>
      </div>
    </div>
  );
}
