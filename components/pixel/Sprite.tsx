/**
 * Renders a character-grid sprite. Each string is a row, each character a pixel looked up
 * in the palette; unmapped characters are transparent.
 */
export function Sprite({
  rows,
  palette,
  px = 8,
  className = "",
  style,
}: {
  rows: string[];
  palette: Record<string, string>;
  px?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={className} style={{ imageRendering: "pixelated", ...style }}>
      {rows.map((row, i) => (
        <div key={i} className="flex">
          {row.split("").map((ch, j) => (
            <div key={j} style={{ width: px, height: px, background: palette[ch] ?? "transparent" }} />
          ))}
        </div>
      ))}
    </div>
  );
}
