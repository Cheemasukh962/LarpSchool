"""
Rebuild tracking CSVs from yc-expo-guests-linkedin-confirmed.csv as source of truth.
Every confirmed candidate appears exactly once in the master status CSV.
Split views: done / failed / pending / photos.
"""

from __future__ import annotations

import csv
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIRMED = ROOT / "yc-expo-guests-linkedin-confirmed.csv"
PROGRESS = ROOT / "data" / "linkedin-enrichment-progress.json"
PHOTO_MANIFEST = ROOT / "data" / "linkedin-photos-manifest.json"
PROFILES = ROOT / "data" / "linkedin_profiles"
OUT = ROOT / "data" / "csv"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_json(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def write_csv(path: Path, rows: list[dict], fieldnames: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in fieldnames})


def main() -> dict:
    confirmed = list(csv.DictReader(CONFIRMED.open(encoding="utf-8", newline="")))
    prog = load_json(PROGRESS, {"people": {}})
    photos = load_json(PHOTO_MANIFEST, {"photos": {}}).get("photos", {})
    people = prog.get("people", {})

    master_fields = [
        "idx",
        "name",
        "first_name",
        "last_name",
        "linkedin",
        "luma_user_id",
        "csv_match_status",
        "csv_confidence",
        "enrich_status",
        "school",
        "company",
        "has_experience",
        "has_education",
        "has_projects",
        "photo_status",
        "photo_file",
        "profile_file",
        "error",
        "enriched_at",
        "in_confirmed",
        "in_progress_tracker",
    ]

    master = []
    seen_ids = set()
    for r in confirmed:
        pid = r.get("luma_user_id") or r.get("linkedin") or ""
        seen_ids.add(pid)
        e = people.get(pid, {})
        ph = photos.get(pid, {})
        # also try photo by scanning profile file stamp
        profile_file = e.get("profile_file") or ""
        local_photo = ph.get("photo_file") or ""
        if not local_photo and profile_file:
            pf = ROOT / profile_file
            if pf.exists():
                try:
                    local_photo = (json.loads(pf.read_text(encoding="utf-8"))).get(
                        "local_photo"
                    ) or ""
                except Exception:
                    pass

        row = {
            "idx": r.get("idx", ""),
            "name": r.get("name", ""),
            "first_name": r.get("first_name", ""),
            "last_name": r.get("last_name", ""),
            "linkedin": r.get("linkedin", ""),
            "luma_user_id": r.get("luma_user_id", ""),
            "csv_match_status": r.get("match_status", ""),
            "csv_confidence": r.get("confidence", ""),
            "enrich_status": e.get("status") or "missing_from_tracker",
            "school": e.get("school") or "",
            "company": e.get("company") or "",
            "has_experience": e.get("has_experience"),
            "has_education": e.get("has_education"),
            "has_projects": e.get("has_projects"),
            "photo_status": ph.get("status")
            or e.get("photo_status")
            or ("unknown" if e.get("status") == "done" else ""),
            "photo_file": local_photo or e.get("photo_file") or "",
            "profile_file": profile_file,
            "error": e.get("error") or ph.get("error") or "",
            "enriched_at": e.get("enriched_at") or "",
            "in_confirmed": True,
            "in_progress_tracker": pid in people,
        }
        master.append(row)

    # orphans in progress but not confirmed
    orphans = []
    for pid, e in people.items():
        if pid in seen_ids:
            continue
        orphans.append(
            {
                "name": e.get("name", ""),
                "linkedin": e.get("linkedin", ""),
                "luma_user_id": e.get("luma_user_id", ""),
                "enrich_status": e.get("status", ""),
                "error": e.get("error") or "",
                "note": "in_progress_tracker_but_not_in_confirmed_csv",
            }
        )

    done = [r for r in master if r["enrich_status"] == "done"]
    failed = [r for r in master if r["enrich_status"] == "failed"]
    pending = [
        r
        for r in master
        if r["enrich_status"] in ("pending", "in_progress", "missing_from_tracker", "")
    ]
    photos_saved = [r for r in master if r["photo_status"] == "saved"]
    photos_default = [r for r in master if r["photo_status"] == "default"]
    photos_missing = [
        r
        for r in master
        if r["enrich_status"] == "done"
        and r["photo_status"] not in ("saved", "default")
    ]

    OUT.mkdir(parents=True, exist_ok=True)
    write_csv(OUT / "01_confirmed_master_status.csv", master, master_fields)
    write_csv(OUT / "02_enrichment_done.csv", done, master_fields)
    write_csv(OUT / "03_enrichment_failed.csv", failed, master_fields)
    write_csv(OUT / "04_enrichment_pending.csv", pending, master_fields)
    write_csv(OUT / "05_photos_saved.csv", photos_saved, master_fields)
    write_csv(OUT / "06_photos_default_avatar.csv", photos_default, master_fields)
    write_csv(OUT / "07_photos_still_needed.csv", photos_missing, master_fields)
    write_csv(
        OUT / "08_orphans_not_in_confirmed.csv",
        orphans,
        ["name", "linkedin", "luma_user_id", "enrich_status", "error", "note"],
    )

    coverage = [
        {
            "generated_at": utc_now(),
            "confirmed_total": len(confirmed),
            "master_rows": len(master),
            "tracker_people": len(people),
            "done": len(done),
            "failed": len(failed),
            "pending": len(pending),
            "photos_saved": len(photos_saved),
            "photos_default": len(photos_default),
            "photos_still_needed": len(photos_missing),
            "orphans_not_in_confirmed": len(orphans),
            "confirmed_missing_from_tracker": sum(
                1 for r in master if not r["in_progress_tracker"]
            ),
            "all_confirmed_accounted_for": len(master) == len(confirmed)
            and sum(1 for r in master if not r["in_progress_tracker"]) == 0,
        }
    ]
    write_csv(
        OUT / "00_coverage_report.csv",
        coverage,
        list(coverage[0].keys()),
    )

    # also keep a simple name checklist ordered like confirmed
    checklist = [
        {
            "idx": r["idx"],
            "name": r["name"],
            "linkedin": r["linkedin"],
            "enrich_status": r["enrich_status"],
            "photo_status": r["photo_status"],
            "school": r["school"],
            "company": r["company"],
        }
        for r in master
    ]
    write_csv(
        OUT / "09_confirmed_checklist.csv",
        checklist,
        [
            "idx",
            "name",
            "linkedin",
            "enrich_status",
            "photo_status",
            "school",
            "company",
        ],
    )

    summary = coverage[0]
    print(
        f"coverage confirmed={summary['confirmed_total']} done={summary['done']} "
        f"failed={summary['failed']} pending={summary['pending']} "
        f"photos={summary['photos_saved']} accounted={summary['all_confirmed_accounted_for']}",
        flush=True,
    )
    return summary


if __name__ == "__main__":
    main()
