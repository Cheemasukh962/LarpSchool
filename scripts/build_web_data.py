"""Reshape precomputed data into small files the web app can cache and serve offline.

Reads:
  data/battlers.json            795 scored guests (source of truth, written by prescore_battlers.py)
  data/crossy-questions.json    133 company questions
  data/yc-expo-companies.json   company intel, used for question branding

Writes:
  public/data/cards.json        one fight-ready card per guest (search list + scorecard + verdict)
  public/data/questions.json    questions remapped to the shape the UI already expects
  data/web/battlers-full.json   full records, kept out of public/ for the Phase 2 DB seed

Photos are handled separately by scripts/build_photos.mjs (needs sharp).
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
BATTLERS = ROOT / "data" / "battlers.json"
QUESTIONS = ROOT / "data" / "crossy-questions.json"
COMPANIES = ROOT / "data" / "yc-expo-companies.json"

PUBLIC_DATA = ROOT / "public" / "data"
WEB_DATA = ROOT / "data" / "web"

# Readable on #0a0a0a and distinct from the gold UI chrome. Assigned by hash so a
# company always gets the same color without us hand-maintaining 52 entries.
PALETTE = [
    "#635bff",
    "#ff5a5f",
    "#0061ff",
    "#9147ff",
    "#ff3008",
    "#10a37f",
    "#4a9eff",
    "#ec4899",
    "#22c55e",
    "#f59e0b",
    "#14b8a6",
    "#a855f7",
]


def stable_hash(text: str) -> int:
    """Small deterministic hash. Python's hash() is salted per process, so we cannot use it."""
    h = 2166136261
    for ch in text:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return h


def brand_color(name: str) -> str:
    return PALETTE[stable_hash(name.lower()) % len(PALETTE)]


def dark_bg(hex_color: str) -> str:
    """Very dark tint of the brand color, for question card backgrounds."""
    r = int(hex_color[1:3], 16)
    g = int(hex_color[3:5], 16)
    b = int(hex_color[5:7], 16)
    return "#%02x%02x%02x" % (round(r * 0.09), round(g * 0.09), round(b * 0.11))


def initials(name: str) -> str:
    parts = [p for p in re.split(r"\s+", (name or "").strip()) if p]
    if not parts:
        return "??"
    if len(parts) == 1:
        return parts[0][:2].upper()
    return (parts[0][0] + parts[1][0]).upper()


def slug_from_linkedin(url: str) -> str:
    m = re.search(r"linkedin\.com/in/([^/?#]+)", url or "", re.I)
    return m.group(1).lower() if m else ""


def top_project(projects: list[dict] | None) -> str:
    for p in projects or []:
        if len(p.get("description") or "") >= 40:
            return p.get("title") or ""
    return (projects or [{}])[0].get("title", "") if projects else ""


def card_from_battler(b: dict[str, Any]) -> dict[str, Any]:
    """Everything a fight needs, and nothing else. Keeps the payload cacheable."""
    breakdown = b.get("breakdown") or {}
    return {
        "id": b["id"],
        "name": b.get("name") or "",
        "initials": initials(b.get("name") or ""),
        "slug": slug_from_linkedin(b.get("linkedin") or ""),
        "linkedin": b.get("linkedin") or "",
        "school": b.get("school") or "",
        "school_tier": b.get("school_tier") or "none",
        "company": b.get("company") or "",
        "title": (b.get("title") or b.get("headline") or "")[:90],
        "flex_score": b.get("flex_score") or 0,
        "larp_index": b.get("larp_index") or 0,
        "rank": b.get("rank") or 0,
        "followers": b.get("followers") or 0,
        "breakdown": {
            "school": breakdown.get("school", 0),
            "work": breakdown.get("work", 0),
            "presence": breakdown.get("presence", 0),
            "projects": breakdown.get("projects", 0),
        },
        "tags": b.get("tags") or [],
        "highlights": b.get("highlights") or [],
        "described_projects": b.get("described_projects") or 0,
        "top_project": top_project(b.get("projects")),
        "compliment": b.get("compliment") or "",
        "roast": b.get("roast") or "",
        "has_photo": bool(b.get("has_photo")),
    }


def build_cards() -> tuple[list[dict], dict]:
    raw = json.loads(BATTLERS.read_text(encoding="utf-8"))
    battlers = raw.get("battlers") or []
    cards = [card_from_battler(b) for b in battlers]
    # Rank order is already applied upstream; keep it so the client never has to sort.
    cards.sort(key=lambda c: c["rank"] or 10**6)
    return cards, raw.get("scoring") or {}


def build_questions() -> list[dict]:
    raw = json.loads(QUESTIONS.read_text(encoding="utf-8"))
    questions = raw.get("questions") or []

    taglines: dict[str, str] = {}
    if COMPANIES.exists():
        for c in json.loads(COMPANIES.read_text(encoding="utf-8")).get("companies") or []:
            if c.get("name"):
                taglines[c["name"]] = c.get("one_liner") or ""

    out = []
    for q in questions:
        company = q.get("company") or "YC"
        color = brand_color(company)
        out.append(
            {
                "id": q.get("id") or "",
                "company": company,
                "initial": (company[:1] or "Y").upper(),
                "color": color,
                "bg": dark_bg(color),
                "tagline": taglines.get(company, ""),
                "kind": q.get("kind") or "",
                "question": q.get("prompt") or "",
                "options": q.get("choices") or [],
                "correct": q.get("answer_index", 0),
                "explain": q.get("explain") or "",
            }
        )
    return out


def kb(path: Path) -> str:
    return f"{path.stat().st_size / 1024:.0f} KB"


def main() -> int:
    PUBLIC_DATA.mkdir(parents=True, exist_ok=True)
    WEB_DATA.mkdir(parents=True, exist_ok=True)

    cards, scoring = build_cards()
    questions = build_questions()

    cards_path = PUBLIC_DATA / "cards.json"
    cards_path.write_text(
        json.dumps({"count": len(cards), "scoring": scoring, "cards": cards}, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    questions_path = PUBLIC_DATA / "questions.json"
    questions_path.write_text(
        json.dumps({"count": len(questions), "questions": questions}, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    full_path = WEB_DATA / "battlers-full.json"
    full_path.write_text(BATTLERS.read_text(encoding="utf-8"), encoding="utf-8")

    tiers: dict[str, int] = {}
    for c in cards:
        tiers[c["school_tier"]] = tiers.get(c["school_tier"], 0) + 1

    print(f"cards      {len(cards):4}  {kb(cards_path)}  -> {cards_path.relative_to(ROOT)}")
    print(f"questions  {len(questions):4}  {kb(questions_path)}  -> {questions_path.relative_to(ROOT)}")
    print(f"seed       {len(cards):4}  {kb(full_path)}  -> {full_path.relative_to(ROOT)}")
    print(f"tiers      {tiers}")
    print(f"photos     {sum(1 for c in cards if c['has_photo'])} cards flagged has_photo")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
