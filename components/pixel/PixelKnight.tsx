import { Sprite } from "./Sprite";
import { pxS } from "./tokens";

const KNIGHT = [
  "___YYYYY__",
  "__YYYYYYY_",
  "__YWWWWYY_",
  "__YWWWWYY_",
  "_KYYYYYYYK",
  "__YYYYYYY_",
  "_YYYYYYYY_",
  "YYYYYYYYYY",
  "_YYYYYYYY_",
  "__YY_YYY__",
  "__YY_YYY__",
  "__WW_WWW__",
];

const PLAYER = ["___YY___", "__YYYY__", "__YYYY__", "_YYYYYY_", "__YYYY__", "_YY__YY_", "_YY__YY_", "_WW__WW_"];
const RIVAL = ["___WW___", "__WWWW__", "__WWWW__", "_WWWWWW_", "__WWWW__", "_WW__WW_", "_WW__WW_", "_GG__GG_"];

export function PixelKnight() {
  return (
    <Sprite
      rows={KNIGHT}
      palette={{ Y: "#ffd700", W: "#fff", K: "#111" }}
      px={8}
      style={{ filter: "drop-shadow(0 0 12px #ffd70088)" }}
    />
  );
}

/** The small duelling pair used above the claim form. */
export function MiniFighters() {
  return (
    <div className="flex items-end justify-center gap-10">
      <Sprite
        rows={PLAYER}
        palette={{ Y: "#ffd700", W: "#fff" }}
        px={6}
        style={{ filter: "drop-shadow(0 0 10px #ffd70099)" }}
      />
      <div
        className="mb-1 flex h-9 w-9 items-center justify-center border-2 border-[#ffd700] bg-[#0a0a0a] text-[#ffd700]"
        style={{ ...pxS("8px"), boxShadow: "2px 2px 0 #b8860b" }}
      >
        VS
      </div>
      <Sprite
        rows={RIVAL}
        palette={{ W: "#fff", G: "#888" }}
        px={6}
        style={{ filter: "drop-shadow(0 0 10px #ffffff55)", transform: "scaleX(-1)" }}
      />
    </div>
  );
}
