"""
Enrich confirmed YC expo guests via Bright Data LinkedIn Profiles API.
Tracks progress in data/linkedin-enrichment-progress.json
Never prints or writes the API key.
"""

from __future__ import annotations

import csv
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
CONFIRMED = ROOT / "yc-expo-guests-linkedin-confirmed.csv"
DATA_DIR = ROOT / "data" / "linkedin_profiles"
PROGRESS = ROOT / "data" / "linkedin-enrichment-progress.json"
RAW_DIR = DATA_DIR / "raw_batches"

DATASET_ID = "gd_l1viktl72bvl7bjuj0"
BATCH_SIZE = 50  # recoverable chunks; Bright Data async supports larger
POLL_SECONDS = 12
MAX_POLL = 90  # ~18 min per batch max


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_token() -> str:
    token = (
        os.environ.get("BRIGHTDATA_API_KEY")
        or os.environ.get("BRIGHTDATA_API_TOKEN")
        or os.environ.get("BRIGHT_DATA_API_TOKEN")
        or ""
    ).strip()
    if not token:
        raise SystemExit(
            "Set BRIGHTDATA_API_KEY (or BRIGHTDATA_API_TOKEN) in the environment."
        )
    return token


def load_confirmed() -> list[dict]:
    with CONFIRMED.open(encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    out = []
    seen = set()
    for r in rows:
        url = (r.get("linkedin") or "").strip().rstrip("/")
        if not url.startswith("http"):
            continue
        key = url.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(
            {
                "luma_user_id": r.get("luma_user_id") or "",
                "name": r.get("name") or "",
                "linkedin": url,
                "match_status": r.get("match_status") or "",
                "confidence": r.get("confidence") or "",
            }
        )
    return out


def empty_progress(people: list[dict]) -> dict:
    return {
        "updated_at": utc_now(),
        "total": len(people),
        "done": 0,
        "failed": 0,
        "pending": len(people),
        "batches": [],
        "people": {
            p["luma_user_id"] or p["linkedin"]: {
                "name": p["name"],
                "linkedin": p["linkedin"],
                "luma_user_id": p["luma_user_id"],
                "status": "pending",
                "error": None,
                "profile_file": None,
                "enriched_at": None,
                "has_experience": None,
                "has_education": None,
                "has_projects": None,
                "school": None,
                "company": None,
            }
            for p in people
        },
    }


def load_or_init_progress(people: list[dict]) -> dict:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    if PROGRESS.exists():
        prog = json.loads(PROGRESS.read_text(encoding="utf-8"))
        # ensure new people appear if CSV grew
        for p in people:
            pid = p["luma_user_id"] or p["linkedin"]
            if pid not in prog["people"]:
                prog["people"][pid] = {
                    "name": p["name"],
                    "linkedin": p["linkedin"],
                    "luma_user_id": p["luma_user_id"],
                    "status": "pending",
                    "error": None,
                    "profile_file": None,
                    "enriched_at": None,
                    "has_experience": None,
                    "has_education": None,
                    "has_projects": None,
                    "school": None,
                    "company": None,
                }
        recount(prog)
        return prog
    return empty_progress(people)


def recount(prog: dict) -> None:
    statuses = [v["status"] for v in prog["people"].values()]
    prog["total"] = len(statuses)
    prog["done"] = sum(1 for s in statuses if s == "done")
    prog["failed"] = sum(1 for s in statuses if s == "failed")
    prog["pending"] = sum(1 for s in statuses if s in ("pending", "in_progress"))
    prog["updated_at"] = utc_now()


def save_progress(prog: dict) -> None:
    recount(prog)
    PROGRESS.write_text(json.dumps(prog, indent=2), encoding="utf-8")
    # also a human-readable CSV tracker
    track_csv = ROOT / "data" / "linkedin-enrichment-tracker.csv"
    with track_csv.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(
            f,
            fieldnames=[
                "status",
                "name",
                "linkedin",
                "luma_user_id",
                "school",
                "company",
                "has_experience",
                "has_education",
                "has_projects",
                "error",
                "profile_file",
                "enriched_at",
            ],
        )
        w.writeheader()
        for row in sorted(
            prog["people"].values(), key=lambda x: (x["status"], x["name"].lower())
        ):
            w.writerow(
                {
                    "status": row["status"],
                    "name": row["name"],
                    "linkedin": row["linkedin"],
                    "luma_user_id": row["luma_user_id"],
                    "school": row.get("school") or "",
                    "company": row.get("company") or "",
                    "has_experience": row.get("has_experience"),
                    "has_education": row.get("has_education"),
                    "has_projects": row.get("has_projects"),
                    "error": row.get("error") or "",
                    "profile_file": row.get("profile_file") or "",
                    "enriched_at": row.get("enriched_at") or "",
                }
            )
    # Split CSVs keyed to confirmed list (done/failed/pending/photos)
    try:
        from export_enrichment_csvs import main as export_csvs

        export_csvs()
    except Exception as e:
        print(f"  csv export warning: {e}", flush=True)


def auth_headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


def trigger_batch(token: str, urls: list[str]) -> str:
    r = requests.post(
        "https://api.brightdata.com/datasets/v3/trigger",
        params={"dataset_id": DATASET_ID, "format": "json", "include_errors": "true"},
        headers=auth_headers(token),
        json=[{"url": u} for u in urls],
        timeout=120,
    )
    if r.status_code >= 400:
        raise RuntimeError(f"trigger failed {r.status_code}: {r.text[:500]}")
    data = r.json()
    sid = data.get("snapshot_id")
    if not sid:
        raise RuntimeError(f"no snapshot_id in response: {data}")
    return sid


def poll_snapshot(token: str, snapshot_id: str) -> str:
    for i in range(MAX_POLL):
        r = requests.get(
            f"https://api.brightdata.com/datasets/v3/progress/{snapshot_id}",
            headers=auth_headers(token),
            timeout=60,
        )
        status = (r.json() or {}).get("status")
        print(f"  poll {i+1}: {status}", flush=True)
        if status == "ready":
            return status
        if status == "failed":
            raise RuntimeError(f"snapshot failed: {r.text[:500]}")
        time.sleep(POLL_SECONDS)
    raise RuntimeError(f"timeout waiting for snapshot {snapshot_id}")


def download_snapshot(token: str, snapshot_id: str) -> list[dict]:
    r = requests.get(
        f"https://api.brightdata.com/datasets/v3/snapshot/{snapshot_id}",
        params={"format": "json"},
        headers=auth_headers(token),
        timeout=300,
    )
    if r.status_code >= 400:
        raise RuntimeError(f"download failed {r.status_code}: {r.text[:500]}")
    # may be JSON array or JSONL
    text = r.text.strip()
    if not text:
        return []
    if text.startswith("["):
        return json.loads(text)
    return [json.loads(line) for line in text.splitlines() if line.strip()]


def normalize_url(u: str | None) -> str:
    if not u:
        return ""
    return u.strip().rstrip("/").lower().split("?")[0]


def profile_slug(url: str) -> str:
    parts = normalize_url(url).split("/in/")
    if len(parts) < 2:
        return "unknown"
    return parts[1].strip("/").replace("/", "_")[:80]


def summarize_profile(p: dict) -> dict:
    company = p.get("current_company_name")
    if not company and isinstance(p.get("current_company"), dict):
        company = p["current_company"].get("name")
    exp = p.get("experience")
    edu = p.get("education")
    projects = [x for x in (p.get("projects") or []) if x]
    return {
        "school": p.get("educations_details"),
        "company": company,
        "has_experience": bool(exp),
        "has_education": bool(edu) or bool(p.get("educations_details")),
        "has_projects": len(projects) > 0,
    }


def apply_results(
    prog: dict,
    batch_people: list[dict],
    results: list[dict],
    batch_id: str,
) -> None:
    by_url: dict[str, dict] = {}
    for p in results:
        # Bright Data sometimes returns regional hosts; match on /in/slug
        for key in ("input_url", "url", "linkedin_id"):
            val = p.get(key)
            if isinstance(val, str) and "/in/" in val:
                by_url[normalize_url(val)] = p
                # also slug-only index
                by_url[profile_slug(val)] = p
        inp = p.get("input")
        if isinstance(inp, dict) and inp.get("url"):
            by_url[normalize_url(inp["url"])] = p
            by_url[profile_slug(inp["url"])] = p
        if isinstance(inp, str) and "/in/" in inp:
            by_url[normalize_url(inp)] = p

    batch_path = RAW_DIR / f"{batch_id}.json"
    batch_path.write_text(json.dumps(results, indent=2), encoding="utf-8")

    for person in batch_people:
        pid = person["luma_user_id"] or person["linkedin"]
        entry = prog["people"][pid]
        url_n = normalize_url(person["linkedin"])
        slug = profile_slug(person["linkedin"])
        profile = by_url.get(url_n) or by_url.get(slug)

        if not profile or profile.get("error"):
            entry["status"] = "failed"
            entry["error"] = (profile or {}).get("error") or "no profile returned"
            entry["enriched_at"] = utc_now()
            continue

        out_name = f"{slug}__{pid}.json"
        out_path = DATA_DIR / out_name
        payload = {
            "luma_user_id": person["luma_user_id"],
            "csv_name": person["name"],
            "csv_linkedin": person["linkedin"],
            "enriched_at": utc_now(),
            "batch_id": batch_id,
            "profile": profile,
        }
        out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

        summary = summarize_profile(profile)
        entry.update(summary)
        entry["status"] = "done"
        entry["error"] = None
        entry["profile_file"] = str(out_path.relative_to(ROOT))
        entry["enriched_at"] = utc_now()


def pending_people(prog: dict, people: list[dict]) -> list[dict]:
    out = []
    for p in people:
        pid = p["luma_user_id"] or p["linkedin"]
        st = prog["people"][pid]["status"]
        if st in ("pending", "failed"):  # retry failed too unless --no-retry
            out.append(p)
    return out


def run(max_batches: int | None = None, retry_failed: bool = True) -> None:
    token = get_token()
    people = load_confirmed()
    prog = load_or_init_progress(people)

    todo = []
    for p in people:
        pid = p["luma_user_id"] or p["linkedin"]
        st = prog["people"][pid]["status"]
        if st == "pending" or (retry_failed and st == "failed"):
            todo.append(p)

    print(
        f"total={len(people)} done={prog['done']} failed={prog['failed']} todo={len(todo)}",
        flush=True,
    )
    if not todo:
        print("Nothing left to enrich.")
        save_progress(prog)
        return

    batches = [todo[i : i + BATCH_SIZE] for i in range(0, len(todo), BATCH_SIZE)]
    if max_batches is not None:
        batches = batches[:max_batches]

    for bi, batch in enumerate(batches, 1):
        urls = [p["linkedin"] for p in batch]
        print(f"\n=== batch {bi}/{len(batches)} size={len(urls)} ===", flush=True)
        for p in batch:
            pid = p["luma_user_id"] or p["linkedin"]
            prog["people"][pid]["status"] = "in_progress"
        save_progress(prog)

        try:
            snapshot_id = trigger_batch(token, urls)
            print(f"  snapshot_id={snapshot_id}", flush=True)
            poll_snapshot(token, snapshot_id)
            results = download_snapshot(token, snapshot_id)
            print(f"  downloaded={len(results)}", flush=True)
            apply_results(prog, batch, results, snapshot_id)
            prog["batches"].append(
                {
                    "snapshot_id": snapshot_id,
                    "size": len(batch),
                    "downloaded": len(results),
                    "at": utc_now(),
                }
            )
        except Exception as e:
            print(f"  BATCH ERROR: {e}", flush=True)
            for p in batch:
                pid = p["luma_user_id"] or p["linkedin"]
                if prog["people"][pid]["status"] == "in_progress":
                    prog["people"][pid]["status"] = "failed"
                    prog["people"][pid]["error"] = str(e)[:300]
                    prog["people"][pid]["enriched_at"] = utc_now()

        save_progress(prog)
        print(
            f"  progress done={prog['done']} failed={prog['failed']} pending={prog['pending']}",
            flush=True,
        )

    print("\nFinished run.", flush=True)
    print(f"tracker: {PROGRESS}")
    print(f"csv: {ROOT / 'data' / 'linkedin-enrichment-tracker.csv'}")
    print(f"profiles: {DATA_DIR}")


if __name__ == "__main__":
    # optional: --max-batches N
    max_b = None
    if "--max-batches" in sys.argv:
        i = sys.argv.index("--max-batches")
        max_b = int(sys.argv[i + 1])
    no_retry = "--no-retry" in sys.argv
    run(max_batches=max_b, retry_failed=not no_retry)
