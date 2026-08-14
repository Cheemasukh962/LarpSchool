import { Sprite } from "./Sprite";

const PALETTE: Record<string, string> = { Y: "#b8860b", G: "#6b4c00", K: "#3a2800", O: "#ffd700" };
const LID = ["YYYYYYYYYYYYYYY", "YGGGGGGGGGGGGYY", "YYYYYYYYYYYYYYY"];
const BODY = [
  "YYYYYYYYYYYYYYY",
  "YGGGKKKKKKKGYYY",
  "YGGGKOOOOKKGYYY",
  "YGGGKOOOOKKGYYY",
  "YGGGKKKKKKKGYYY",
  "YYYYYYYYYYYYYYY",
  "YYYYYYYYYYYYYYY",
];

export function PixelChest({ open }: { open: boolean }) {
  return (
    <div style={{ imageRendering: "pixelated", filter: "drop-shadow(0 0 16px #ffd70066)" }}>
      <div
        style={{
          transform: open ? "translateY(-80%) scaleY(0.6)" : "none",
          transformOrigin: "bottom center",
          transition: "transform 0.4s ease-out",
        }}
      >
        <Sprite rows={LID} palette={PALETTE} px={8} />
      </div>
      <Sprite rows={BODY} palette={PALETTE} px={8} />
    </div>
  );
}
