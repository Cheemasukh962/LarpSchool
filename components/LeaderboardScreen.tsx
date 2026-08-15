"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Coins, Trophy } from "lucide-react";

import type { LeaderboardPayload } from "@/lib/leaderboard-types";
import { PixelBorder, pxS } from "@/components/pixel";
import { Shell } from "@/components/Shell";

const POLL_MS = 30_000;

export function LeaderboardScreen() {
  const [board, setBoard] = useState<LeaderboardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    fetch("/api/leaderboard", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`leaderboard ${res.status}`);
        return res.json() as Promise<LeaderboardPayload>;
      })
      .then((data) => {
        if (!alive) return;
        setBoard(data);
        setError(null);
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      alive = false;
    };
  }, [tick]);

  useEffect(() => {
    const iv = setInterval(() => setTick((n) => n + 1), POLL_MS);
    return () => clearInterval(iv);
  }, []);

  const updated = board?.updatedAt
    ? new Date(board.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "—";

  return (
    <Shell>
      <div className="flex shrink-0 items-center justify-between border-b border-[#ffd700]/20 px-5 py-3">
        <Link href="/" style={pxS("6px")} className="text-white/35 transition hover:text-white">
          ← GAME
        </Link>
        <div className="flex items-center gap-2 text-[#ffd700]">
          <Trophy size={14} />
          <span style={pxS("8px")}>BOARD</span>
        </div>
        <button onClick={() => setTick((n) => n + 1)} style={pxS("6px")} className="text-[#ffd700]/70">
          REFRESH
        </button>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto px-5 py-4">
        <div style={pxS("5px")} className="mb-4 leading-loose text-white/30">
          RANKED BY BETS HIT
          <br />
          UPDATES EVERY 30S · {updated}
        </div>

        {error && (
          <div style={pxS("6px")} className="mb-4 text-[#ef4444]">
            {error.toUpperCase()}
          </div>
        )}

        {board?.mode === "local" && (
          <div style={pxS("6px")} className="leading-loose text-white/35">
            LEADERBOARD NEEDS SUPABASE
          </div>
        )}

        {board && board.rows.length === 0 && board.mode === "supabase" && (
          <div style={pxS("6px")} className="leading-loose text-white/35">
            NO ENTRIES YET
            <br />
            CLAIM A CARD AND WIN A BET
          </div>
        )}

        <div className="flex flex-col gap-2">
          {board?.rows.map((row) => (
            <PixelBorder key={`${row.rank}-${row.name}`} gold={row.you || row.rank === 1} className="w-full">
              <div
                className="flex items-center gap-3 px-3 py-3"
                style={{ background: row.you ? "#140d00" : "#0a0a0a" }}
              >
                <div style={{ ...pxS("10px"), color: row.rank <= 3 ? "#ffd700" : "#ffffff55", width: 28 }}>
                  {row.rank}
                </div>
                <div className="min-w-0 flex-1">
                  <div style={pxS("6px")} className="truncate text-white">
                    {row.name.toUpperCase()}
                  </div>
                  <div style={pxS("4px")} className="mt-1 text-white/30">
                    {row.guest ? "WALK-IN" : "CLAIMED"}
                    {row.you ? " · YOU" : ""}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <div style={pxS("7px")} className="text-[#ffd700]">
                    {row.battlesWon} WINS
                  </div>
                  <div className="flex items-center gap-1 text-white/40" style={pxS("4px")}>
                    <Coins size={9} /> {row.tokens}
                  </div>
                </div>
              </div>
            </PixelBorder>
          ))}
        </div>
      </div>
    </Shell>
  );
}
