"use client";

import { useEffect, useState } from "react";

import type { LeaderboardPayload } from "@/lib/leaderboard-types";
import { STARTING_TOKENS } from "@/lib/site-url";
import { useGame } from "@/lib/game-store";
import { PixelKnight, pxS } from "./pixel";
import { Shell } from "./Shell";

const CORNERS = ["top-3 left-3", "top-3 right-3", "bottom-3 left-3", "bottom-3 right-3"];

export function CoverScreen() {
  const { setScreen, data, loading, error, retryLoad } = useGame();
  const [blink, setBlink] = useState(true);
  const [hiScore, setHiScore] = useState<number | null>(null);

  useEffect(() => {
    const iv = setInterval(() => setBlink((b) => !b), 530);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    fetch("/api/leaderboard", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<LeaderboardPayload>) : null))
      .then((board) => {
        const top = board?.rows[0];
        if (top) setHiScore(top.battlesWon);
      })
      .catch(() => undefined);
  }, []);

  const ready = Boolean(data);

  return (
    <Shell>
      {CORNERS.map((pos) => (
        <div
          key={pos}
          className={`pointer-events-none absolute z-20 text-[#ffd700]/30 ${pos}`}
          style={pxS("10px")}
        >
          +
        </div>
      ))}
      <div className="flex flex-1 flex-col items-center justify-between px-6 py-10 text-center">
        <div className="flex flex-col items-center gap-2">
          <div style={pxS("7px")} className="text-[#ffd700]/50">
            FIGHTERS &nbsp;<span className="text-white">{data ? String(data.cards.length).padStart(6, "0") : "······"}</span>
          </div>
          <div style={pxS("7px")} className="text-[#ffd700]/50">
            HI-SCORE &nbsp;<span className="text-white">{hiScore !== null ? String(hiScore).padStart(6, "0") : "······"}</span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-6">
          <div className="relative flex items-center justify-center">
            <div className="absolute h-32 w-32 rounded-full bg-[#ffd700]/10 blur-2xl" />
            <div className="absolute h-20 w-20 rounded-full border border-[#ffd700]/20" />
            <PixelKnight />
          </div>

          <div className="flex flex-col items-center gap-1">
            {["LARP", "EXO", "GAME"].map((word, i) => (
              <div
                key={word}
                style={{
                  ...pxS("clamp(20px,7vw,30px)"),
                  color: i === 1 ? "#fff" : "#ffd700",
                  textShadow:
                    i === 1
                      ? "3px 3px 0 #444,5px 5px 0 rgba(0,0,0,.5)"
                      : "3px 3px 0 #b8860b,5px 5px 0 rgba(0,0,0,.5)",
                  lineHeight: 1.3,
                }}
              >
                {word}
              </div>
            ))}
          </div>

          {error ? (
            <button
              onClick={retryLoad}
              className="mt-2 border-2 border-[#ef4444]/50 px-4 py-3 text-[#ef4444] transition active:scale-95"
              style={pxS("7px")}
            >
              LOAD FAILED — RETRY
            </button>
          ) : (
            <button
              onClick={() => setScreen("app")}
              disabled={!ready}
              className="mt-2 transition active:scale-95 disabled:active:scale-100"
              style={{
                ...pxS("9px"),
                opacity: loading ? 0.55 : blink ? 1 : 0,
                color: "#ffd700",
                transition: "opacity .1s",
              }}
            >
              {loading ? "LOADING..." : "PRESS START"}
            </button>
          )}
        </div>

        <div style={pxS("6px")} className="leading-loose text-[#ffffff30]">
          NEW PHONE GETS {STARTING_TOKENS} TOKENS
          <br />
          PLAY-ONLY · NO CASH VALUE
        </div>
      </div>
    </Shell>
  );
}
