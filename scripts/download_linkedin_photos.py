"""
Download LinkedIn avatar photos for enriched profiles.
Safe to re-run; skips files that already exist.
Runs alongside enrich_linkedin_brightdata.py.
"""

from __future__ import annotations

import json
import re
import time
from pathlib import Path
from urllib.parse import urlparse

import requests

ROOT = Path(__file__).resolve().parents[1]
PROFILES = ROOT / "data" / "linkedin_profiles"
PHOTOS = ROOT / "data" / "linkedin_photos"
PROGRESS = ROOT / "data" / "linkedin-enrichment-progress.json"
MANIFEST = ROOT / "data" / "linkedin-photos-manifest.json"

DEFAULT_MARKERS = (
    "static.licdn.com/aero-v1/sc/h/9c8pery4andzj6ohjkjp54ma2",
    "static.licdn.com/aero-v1/sc/h/",
)


def is_default_avatar(url: str | None, profile: dict) -> bool:
    if profile.get("default_avatar") is True:
        return True
    if not url:
        return True
    return any(m in url for m in DEFAULT_MARKERS[:1])  # exact default silhouette


def ext_from_url(url: str) -> str:
    path = urlparse(url).path.lower()
    for e in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        if e in path:
            return e.lstrip(".")
    return "jpg"


def safe_name(slug: str) -> str:
    return re.sub(r"[^a-zA-Z0-9._-]+", "_", slug)[:100]


def load_manifest() -> dict:
    if MANIFEST.exists():
        return json.loads(MANIFEST.read_text(encoding="utf-8"))
    return {"updated_at": None, "photos": {}}


def save_manifest(m: dict) -> None:
    MANIFEST.write_text(json.dumps(m, indent=2), encoding="utf-8")


def download_one(session: requests.Session, url: str, dest: Path) -> bool:
    r = session.get(url, timeout=60, headers={"User-Agent": "Mozilla/5.0"})
    if r.status_code != 200 or not r.content:
        return False
    dest.write_bytes(r.content)
    return True


def process_existing(once: bool = False, watch_seconds: int = 3600) -> None:
    PHOTOS.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    manifest = load_manifest()
    deadline = time.time() + watch_seconds

    while True:
        files = sorted(PROFILES.glob("*.json"))
        added = 0
        for f in files:
            data = json.loads(f.read_text(encoding="utf-8"))
            pid = data.get("luma_user_id") or f.stem
            if pid in manifest["photos"] and manifest["photos"][pid].get("status") == "saved":
                continue
            if pid in manifest["photos"] and manifest["photos"][pid].get("status") == "default":
                continue

            profile = data.get("profile") or {}
            avatar = profile.get("avatar")
            name = data.get("csv_name") or profile.get("name") or pid
            slug = safe_name(f.stem)

            entry = {
                "name": name,
                "luma_user_id": data.get("luma_user_id"),
                "linkedin": data.get("csv_linkedin"),
                "avatar_url": avatar,
                "status": None,
                "photo_file": None,
                "is_default": False,
            }

            if not avatar:
                entry["status"] = "missing"
                manifest["photos"][pid] = entry
                continue

            if is_default_avatar(avatar, profile):
                entry["status"] = "default"
                entry["is_default"] = True
                manifest["photos"][pid] = entry
                continue

            ext = ext_from_url(avatar)
            dest = PHOTOS / f"{slug}.{ext}"
            try:
                ok = download_one(session, avatar, dest)
                if ok:
                    entry["status"] = "saved"
                    entry["photo_file"] = str(dest.relative_to(ROOT))
                    added += 1
                    # also stamp on profile json for convenience
                    data["local_photo"] = entry["photo_file"]
                    f.write_text(json.dumps(data, indent=2), encoding="utf-8")
                else:
                    entry["status"] = "download_failed"
            except Exception as e:
                entry["status"] = "download_failed"
                entry["error"] = str(e)[:200]

            manifest["photos"][pid] = entry

        # sync progress file photo fields if present
        if PROGRESS.exists():
            prog = json.loads(PROGRESS.read_text(encoding="utf-8"))
            for pid, entry in manifest["photos"].items():
                if pid in prog.get("people", {}):
                    prog["people"][pid]["photo_status"] = entry.get("status")
                    prog["people"][pid]["photo_file"] = entry.get("photo_file")
            PROGRESS.write_text(json.dumps(prog, indent=2), encoding="utf-8")

        from datetime import datetime, timezone

        manifest["updated_at"] = datetime.now(timezone.utc).isoformat()
        saved = sum(1 for v in manifest["photos"].values() if v.get("status") == "saved")
        default = sum(1 for v in manifest["photos"].values() if v.get("status") == "default")
        missing = sum(1 for v in manifest["photos"].values() if v.get("status") == "missing")
        failed = sum(1 for v in manifest["photos"].values() if v.get("status") == "download_failed")
        save_manifest(manifest)
        print(
            f"photos saved={saved} default={default} missing={missing} failed={failed} new_this_pass={added}",
            flush=True,
        )

        if once:
            break

        # stop watching if enrichment looks finished and nothing new
        pending = 0
        if PROGRESS.exists():
            prog = json.loads(PROGRESS.read_text(encoding="utf-8"))
            pending = prog.get("pending", 0)
        if pending == 0 and added == 0:
            print("Enrichment pending=0 and no new photos; stopping watcher.", flush=True)
            break
        if time.time() > deadline:
            print("Watch deadline reached.", flush=True)
            break
        time.sleep(20)


if __name__ == "__main__":
    import sys

    once = "--once" in sys.argv
    process_existing(once=once, watch_seconds=7200)
