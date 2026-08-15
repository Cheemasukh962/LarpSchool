"use client";

import Link from "next/link";

import { JoinQr } from "@/components/JoinQr";
import { Shell } from "@/components/Shell";
import { STARTING_TOKENS } from "@/lib/site-url";
import { pxS } from "@/components/pixel";

export default function JoinPage() {
  return (
    <main className="mx-auto h-[100dvh] w-full max-w-[430px] overflow-hidden">
      <Shell>
        <div className="flex flex-1 flex-col items-center justify-between px-6 py-8 text-center">
          <div style={pxS("7px")} className="text-[#ffd700]">
            SCAN TO PLAY
          </div>
          <JoinQr size={240} />
          <div className="flex flex-col items-center gap-3">
            <div style={pxS("6px")} className="leading-loose text-white/40">
              NEW PHONE GETS {STARTING_TOKENS} TOKENS
              <br />
              PLAY-ONLY · NO CASH VALUE
            </div>
            <Link href="/" className="px-5 py-3 text-[#0a0a0a]" style={{ ...pxS("7px"), background: "#ffd700" }}>
              OPEN GAME
            </Link>
          </div>
        </div>
      </Shell>
    </main>
  );
}
