"""Retry Bright Data failed LinkedIn URLs via Crustdata person enrich.

Reads CRUSTDATA_API_KEY from the environment. Does not write the key to disk.
"""
from __future__ import annotations

import csv
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(r"C:\Users\Cheem\LarpSchool")
FAILED_CSV = ROOT / "data" / "csv" / "03_enrichment_failed.csv"
OUT_DIR = ROOT / "data" / "crustdata_profiles"
OUT_CSV = ROOT / "data" / "csv" / "11_crustdata_failed_retry.csv"
RAW_PATH = ROOT / "data" / "crustdata_bakeoff" / "failed_retry_raw.json"
PHOTO_DIR = ROOT / "data" / "linkedin_photos"
API = "https://api.crustdata.com"
VERSION = "2025-11-01"
BATCH = 25
FIELDS = ["basic_profile", "experience", "education", "skills", "professional_network"]


def clean_url(url: str) -> str:
    u = (url or "").strip().replace(" ", "")
    if u.endswith("/"):
        u = u[:-1]
    return u


def slug_from_url(url: str) -> str:
    path = url.rstrip("/").split("/")[-1]
    slug = re.sub(r"[^a-zA-Z0-9_-]+", "-", path).strip("-").lower()
    return slug or "unknown"


def request_json(method: str, path: str, key: str, body: dict | None = None, timeout: int = 90):
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = Request(
        API + path,
        data=data,
        method=method,
        headers={
            "authorization": f"Bearer {key}",
            "content-type": "application/json",
            "x-api-version": VERSION,
            "accept": "application/json",
        },
    )
    try:
        with urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            headers = {k.lower(): v for k, v in resp.headers.items()}
            return resp.status, json.loads(raw), headers
    except HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        headers = {k.lower(): v for k, v in e.headers.items()} if e.headers else {}
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            payload = {"error": raw}
        return e.code, payload, headers


def jobs_from(person: dict) -> list[dict]:
    details = ((person.get("experience") or {}).get("employment_details") or {})
    rows = []
    for bucket in ("current", "past"):
        for row in details.get(bucket) or []:
            if isinstance(row, dict):
                rows.append(row)
    return rows


def schools_from(person: dict) -> list[dict]:
    schools = (person.get("education") or {}).get("schools") or []
    return [s for s in schools if isinstance(s, dict)]


def download_photo(url: str, dest: Path) -> bool:
    if not url:
        return False
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = Request(url, headers={"user-agent": "Mozilla/5.0"})
    try:
        with urlopen(req, timeout=30) as resp:
            data = resp.read()
        if len(data) < 200:
            return False
        dest.write_bytes(data)
        return True
    except (HTTPError, URLError, TimeoutError, OSError):
        return False


def main() -> int:
    key = os.environ.get("CRUSTDATA_API_KEY", "").strip()
    if not key:
        print("Set CRUSTDATA_API_KEY", file=sys.stderr)
        return 2

    with FAILED_CSV.open(encoding="utf-8") as f:
        people = list(csv.DictReader(f))

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    PHOTO_DIR.mkdir(parents=True, exist_ok=True)
    RAW_PATH.parent.mkdir(parents=True, exist_ok=True)

    now = datetime.now(timezone.utc).isoformat()
    urls = []
    by_url: dict[str, dict] = {}
    for row in people:
        url = clean_url(row.get("linkedin") or "")
        row["_clean_url"] = url
        urls.append(url)
        by_url.setdefault(url, row)

    raw_batches = []
    matched_by_url: dict[str, dict] = {}
    for i in range(0, len(urls), BATCH):
        chunk = urls[i : i + BATCH]
        status, payload, headers = request_json(
            "POST",
            "/person/enrich",
            key,
            {"professional_network_profile_urls": chunk, "fields": FIELDS},
        )
        raw_batches.append(
            {"status": status, "credits_used": headers.get("x-credits-used"), "payload": payload}
        )
        print(f"batch {i // BATCH + 1} HTTP {status} n={len(chunk)} credits={headers.get('x-credits-used')}")
        if status != 200 or not isinstance(payload, list):
            print(json.dumps(payload, indent=2)[:2000])
            continue
        for item in payload:
            matched_on = clean_url((item or {}).get("matched_on") or "")
            matched_by_url[matched_on] = item
        if i + BATCH < len(urls):
            time.sleep(4)

    credit_status, credit_payload, _ = request_json("GET", "/account/credits", key)

    summary_rows = []
    matched = 0
    photos = 0
    for row in people:
        url = row["_clean_url"]
        item = matched_by_url.get(url) or {}
        matches = item.get("matches") if isinstance(item, dict) else []
        person = (matches[0] or {}).get("person_data") if matches else None
        luma = row.get("luma_user_id") or ""
        slug = slug_from_url(url)
        profile_rel = ""
        photo_rel = ""
        photo_ok = False
        basic = (person or {}).get("basic_profile") or {}
        jobs = jobs_from(person or {}) if person else []
        schools = schools_from(person or {}) if person else []
        current = jobs[0] if jobs else {}
        if person:
            matched += 1
            record = {
                "source": "crustdata",
                "recovered_from": "brightdata_failed_private",
                "luma_user_id": luma,
                "csv_name": row.get("name"),
                "csv_linkedin": row.get("linkedin"),
                "clean_linkedin": url,
                "enriched_at": now,
                "person_data": person,
            }
            fname = f"{slug}__{luma}.json" if luma else f"{slug}.json"
            path = OUT_DIR / fname
            path.write_text(json.dumps(record, indent=2), encoding="utf-8")
            profile_rel = str(path.relative_to(ROOT))
            pic = basic.get("profile_picture_permalink") or (
                (person.get("professional_network") or {}).get("profile_picture_permalink")
            )
            if pic:
                photo_name = f"{slug}__{luma}.jpg" if luma else f"{slug}.jpg"
                dest = PHOTO_DIR / photo_name
                if download_photo(pic, dest):
                    photo_ok = True
                    photos += 1
                    photo_rel = str(dest.relative_to(ROOT))

        summary_rows.append(
            {
                "name": row.get("name"),
                "luma_user_id": luma,
                "linkedin": url,
                "original_linkedin": row.get("linkedin"),
                "crustdata_status": "matched" if person else "no_match",
                "crustdata_name": basic.get("name") or "",
                "headline": (basic.get("headline") or "")[:180],
                "current_title": basic.get("current_title") or current.get("title") or "",
                "current_company": current.get("name") or "",
                "job_count": len(jobs),
                "school_count": len(schools),
                "school": (schools[0].get("school") if schools else "") or "",
                "photo_saved": photo_ok,
                "profile_file": profile_rel,
                "photo_file": photo_rel,
            }
        )
        flag = "HIT" if person else "MISS"
        print(
            f"{flag:4} {row.get('name'):28} jobs={len(jobs):2} "
            f"{basic.get('current_title') or ''} @ {current.get('name') or ''}"
        )

    fields = list(summary_rows[0].keys())
    with OUT_CSV.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(summary_rows)

    RAW_PATH.write_text(
        json.dumps(
            {
                "enriched_at": now,
                "input_count": len(people),
                "matched": matched,
                "no_match": len(people) - matched,
                "photos_saved": photos,
                "credits_after": credit_payload if credit_status == 200 else credit_payload,
                "batches": raw_batches,
            },
            indent=2,
            default=str,
        ),
        encoding="utf-8",
    )

    print(
        f"\nmatched {matched}/{len(people)}  photos={photos}  "
        f"credits_after={credit_payload}  csv={OUT_CSV}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
