"""Pre-score every confirmed expo guest into data/battlers.json."""
from __future__ import annotations

import csv
import json
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from larp_engine import battle, extract_card, enrich_card  # noqa: E402

CONFIRMED = ROOT / "yc-expo-guests-linkedin-confirmed.csv"
PROFILES = ROOT / "data" / "linkedin_profiles"
CRUST = ROOT / "data" / "crustdata_profiles"
PHOTO_MANIFEST = ROOT / "data" / "linkedin-photos-manifest.json"
OUT_JSON = ROOT / "data" / "battlers.json"
OUT_CSV = ROOT / "data" / "csv" / "12_larp_scores.csv"


def load_bd_by_luma() -> dict[str, dict]:
    out = {}
    for path in PROFILES.glob("*.json"):
        if path.name.startswith("raw_"):
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        luma = data.get("luma_user_id")
        if luma:
            out[luma] = data
    return out


def load_crust_by_luma() -> dict[str, dict]:
    out = {}
    if not CRUST.exists():
        return out
    for path in CRUST.glob("*.json"):
        data = json.loads(path.read_text(encoding="utf-8"))
        luma = data.get("luma_user_id")
        if luma:
            out[luma] = data
    return out


def main() -> int:
    bd = load_bd_by_luma()
    crust = load_crust_by_luma()
    photos = json.loads(PHOTO_MANIFEST.read_text(encoding="utf-8")).get("photos") or {}

    with CONFIRMED.open(encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    battlers = []
    for row in rows:
        luma = (row.get("luma_user_id") or "").strip()
        if not luma:
            continue
        card = extract_card(
            luma_row=row,
            bd=bd.get(luma),
            crust=crust.get(luma),
            photo=photos.get(luma),
        )
        battlers.append(enrich_card(card))

    battlers.sort(key=lambda c: (-c["flex_score"], c["name"] or ""))
    for i, c in enumerate(battlers, start=1):
        c["rank"] = i

    OUT_JSON.write_text(
        json.dumps(
            {
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "count": len(battlers),
                "scoring": {
                    "flex_score": "Who wins (0-100). School 32 + work 32 + presence 26 + projects 10.",
                    "school": "T0=32 (Stanford/MIT/Berkeley/CMU/Waterloo/Ivy/IIT/Oxbridge). T1=22. T2=14 (Davis, Purdue, other college). HS=4.",
                    "work": "FAANG-tier intern/job=32 (equals T0 school). Other prestige shop=24. Named founder=20. Named company=16. Stealth=6.",
                    "presence": "log10(followers+1)*6.5 +3 personal site, cap 26.",
                    "projects": "Described writeups *2 cap 8 + hackathon cap 2. Last on purpose — not everyone posts them.",
                    "larp_index": "LinkedIn theater (stealth, incoming, stuffed headline, founder-with-no-ship). Roast badge, not the winner.",
                    "battle": "Higher flex_score wins. Tie -> lower larp_index, then name. Verdict is templated, no API.",
                },
                "battlers": battlers,
            },
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    fields = [
        "rank",
        "name",
        "flex_score",
        "larp_index",
        "school_tier",
        "school_pts",
        "work_pts",
        "presence_pts",
        "projects_pts",
        "school",
        "company",
        "title",
        "project_count",
        "job_count",
        "followers",
        "tags",
        "compliment",
        "roast",
        "linkedin",
        "id",
    ]
    with OUT_CSV.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        for c in battlers:
            bd = c.get("breakdown") or {}
            w.writerow(
                {
                    **c,
                    "school_pts": bd.get("school"),
                    "work_pts": bd.get("work"),
                    "presence_pts": bd.get("presence"),
                    "projects_pts": bd.get("projects"),
                    "tags": ",".join(c.get("tags") or []),
                }
            )

    scores = [c["flex_score"] for c in battlers]
    scores_sorted = sorted(scores)
    n = len(scores_sorted)
    def pct(p):
        return scores_sorted[min(n - 1, int(p / 100 * n))]

    print(f"battlers={n}")
    print(
        f"flex min={min(scores)} p25={pct(25)} p50={pct(50)} p75={pct(75)} "
        f"p90={pct(90)} max={max(scores)} mean={sum(scores)/n:.1f}"
    )
    print("tags", Counter(t for c in battlers for t in c["tags"]).most_common(16))
    print("school_tier", Counter(c.get("school_tier") for c in battlers))
    print("\nTOP 8")
    for c in battlers[:8]:
        bd = c.get("breakdown") or {}
        print(
            f"  #{c['rank']:3} {c['flex_score']:3} {c.get('school_tier','?'):3} "
            f"s{bd.get('school',0):2} w{bd.get('work',0):2} p{bd.get('presence',0):2} "
            f"j{bd.get('projects',0):2}  {c['name']:24} {(c['school'] or '')[:40]}"
        )
    print("\nBOTTOM 5")
    for c in battlers[-5:]:
        print(f"  #{c['rank']:3} {c['flex_score']:3} larp={c['larp_index']:2} {c['name']:24} {c.get('roast','')[:90]}")

    by_id = {c["id"]: c for c in battlers}
    sukh = by_id.get("usr-eBCbClen2tK2Owe")

    def line(c):
        bd = c.get("breakdown") or {}
        return (
            f"#{c['rank']} flex={c['flex_score']} {c.get('school_tier')} "
            f"school={bd.get('school')} work={bd.get('work')} "
            f"presence={bd.get('presence')} projects={bd.get('projects')} "
            f"{c['name']} | {c.get('school') or '-'} | {c.get('company') or '-'}"
        )

    stanford = next(
        (c for c in battlers if "stanford" in (c.get("school") or "").lower()),
        None,
    )
    davis = [c for c in battlers if "davis" in (c.get("school") or "").lower()][:5]
    print("\nSTANFORD vs DAVIS")
    if stanford:
        print("  stanford", line(stanford))
    for c in davis:
        print("  davis   ", line(c))

    davis_apple = next(
        (
            c
            for c in battlers
            if "davis" in (c.get("school") or "").lower()
            and "apple" in (c.get("company") or "").lower()
        ),
        None,
    )
    berk_empty = next(
        (
            c
            for c in reversed(battlers)
            if "berkeley" in (c.get("school") or "").lower()
            and (c.get("breakdown") or {}).get("work", 0) == 0
        ),
        None,
    )
    print("\nDAVIS+APPLE vs BERKELEY EMPTY")
    if davis_apple:
        print("  davis apple    ", line(davis_apple))
    if berk_empty:
        print("  berkeley none  ", line(berk_empty))
    if davis_apple and berk_empty:
        result = battle(davis_apple, berk_empty)
        print(" ", result["verdict"])

    if sukh:
        print("\nYOU ", line(sukh))
        print("  ", sukh["compliment"])
        print("  ", sukh["roast"])
        opps = ["usr-eXClwAqiRDCHFIG", "usr-wtvLj5B6lOktGwP"]
        if stanford:
            opps.append(stanford["id"])
        opps.append(battlers[0]["id"])
        for opp_id in opps:
            opp = by_id.get(opp_id)
            if not opp or opp["id"] == sukh["id"]:
                continue
            result = battle(sukh, opp)
            print(f"\nBATTLE vs {opp['name']} ({opp.get('school_tier')} flex={opp['flex_score']})")
            print(" ", result["verdict"])

    print(f"\nwrote {OUT_JSON}")
    print(f"wrote {OUT_CSV}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
