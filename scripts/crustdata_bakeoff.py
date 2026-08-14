"""Compare Crustdata person enrich vs local Bright Data profiles.

Reads CRUSTDATA_API_KEY from the environment. Does not write the key to disk.
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import urllib.request
import urllib.error

ROOT = Path(r"C:\Users\Cheem\LarpSchool")
OUT = ROOT / "data" / "crustdata_bakeoff"
API = "https://api.crustdata.com"
VERSION = "2025-11-01"

# Mix: Bright Data successes with empty experience, Bright Data private failures,
# one known public executive, one garbage URL.
BAKEOFF = [
    ("success_empty_exp", "https://www.linkedin.com/in/cheema-s", "Sukhman Cheema"),
    ("success_empty_exp", "https://www.linkedin.com/in/abhilashchowdhary", "Abhilash Chowdhary"),
    ("success_empty_exp", "https://www.linkedin.com/in/aadidahake", "Aadi Dahake"),
    ("success_empty_exp", "https://www.linkedin.com/in/alwaysacing", "Aaron Zhu"),
    ("success_empty_exp", "https://www.linkedin.com/in/adrian-mittal", "Adrian Mittal"),
    ("success_empty_exp", "https://www.linkedin.com/in/ali8hsn", "Ali Hussain"),
    ("success_empty_exp", "https://www.linkedin.com/in/satyanadella", "Satya Nadella"),
    ("bd_failed_private", "https://www.linkedin.com/in/jairelan", "Jai Relan"),
    ("bd_failed_private", "https://www.linkedin.com/in/akshayshukla2", "Akshay Shukla"),
    ("bd_failed_private", "https://www.linkedin.com/in/lotte-seifert", "Lotte Seifert"),
    ("bd_failed_private", "https://www.linkedin.com/in/kanishk-krishna16", "Kanishk Krishna"),
    ("bd_failed_private", "https://www.linkedin.com/in/No", "Hari Gangadharan (bad URL)"),
]


def request(method: str, path: str, key: str, body: dict | None = None) -> tuple[int, dict | list | str, dict]:
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
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
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            headers = {k.lower(): v for k, v in resp.headers.items()}
            try:
                parsed = json.loads(raw)
            except json.JSONDecodeError:
                parsed = raw
            return resp.status, parsed, headers
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        headers = {k.lower(): v for k, v in e.headers.items()} if e.headers else {}
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            parsed = raw
        return e.code, parsed, headers


def summarize_person(person_data: dict | None) -> dict:
    if not person_data:
        return {"matched": False}
    basic = person_data.get("basic_profile") or {}
    exp = person_data.get("experience") or {}
    details = exp.get("employment_details") or {}
    current = details.get("current") or []
    past = details.get("past") or []
    edu = person_data.get("education") or {}
    schools = edu.get("schools") or edu.get("education_details") or edu
    if isinstance(schools, dict):
        school_list = schools.get("schools") or schools.get("items") or []
    else:
        school_list = schools if isinstance(schools, list) else []
    skills = person_data.get("skills") or {}
    skill_list = skills.get("professional_network_skills") or skills.get("skills") or []
    jobs = []
    for row in (current + past)[:8]:
        if not isinstance(row, dict):
            continue
        jobs.append(
            {
                "title": row.get("title") or row.get("normalized_title"),
                "company": row.get("company_name") or (row.get("company") or {}).get("name")
                if isinstance(row.get("company"), dict)
                else row.get("company"),
            }
        )
    return {
        "matched": True,
        "name": basic.get("name"),
        "headline": basic.get("headline"),
        "title": basic.get("current_title"),
        "location": (basic.get("location") or {}).get("raw")
        if isinstance(basic.get("location"), dict)
        else basic.get("location"),
        "job_count": len(current) + len(past),
        "jobs": jobs,
        "school_count": len(school_list) if isinstance(school_list, list) else 0,
        "skill_count": len(skill_list) if isinstance(skill_list, list) else 0,
        "sections": sorted(person_data.keys()),
    }


def main() -> int:
    key = os.environ.get("CRUSTDATA_API_KEY", "").strip()
    if not key:
        print("Set CRUSTDATA_API_KEY", file=sys.stderr)
        return 2

    OUT.mkdir(parents=True, exist_ok=True)
    dump: dict = {}

    for label, path, method, body in [
        ("credits", "/account/credits", "GET", None),
        ("endpoints", "/account/endpoints", "GET", None),
    ]:
        status, payload, headers = request(method, path, key, body)
        dump[label] = {"status": status, "payload": payload, "credits_used": headers.get("x-credits-used")}
        print(f"\n=== {label} HTTP {status} credits={headers.get('x-credits-used')} ===")
        print(json.dumps(payload, indent=2)[:4000])

    urls = [u for _, u, _ in BAKEOFF]
    status, payload, headers = request(
        "POST",
        "/person/enrich",
        key,
        {
            "professional_network_profile_urls": urls,
            "fields": ["basic_profile", "experience", "education", "skills", "professional_network"],
        },
    )
    dump["enrich"] = {
        "status": status,
        "credits_used": headers.get("x-credits-used"),
        "payload": payload,
    }
    print(f"\n=== person/enrich HTTP {status} credits={headers.get('x-credits-used')} ===")

    by_url = {}
    if isinstance(payload, list):
        for item in payload:
            by_url[(item or {}).get("matched_on")] = item
    elif isinstance(payload, dict):
        dump["enrich_error"] = payload
        print(json.dumps(payload, indent=2)[:3000])

    rows = []
    for kind, url, name in BAKEOFF:
        item = by_url.get(url) or by_url.get(url + "/") or {}
        matches = item.get("matches") if isinstance(item, dict) else []
        person = (matches[0] or {}).get("person_data") if matches else None
        summary = summarize_person(person)
        summary.update({"kind": kind, "input_url": url, "csv_name": name, "match_count": len(matches or [])})
        rows.append(summary)
        print(
            f"{kind:20} {name:28} matches={summary.get('match_count', 0)} "
            f"jobs={summary.get('job_count', 0)} schools={summary.get('school_count', 0)} "
            f"title={summary.get('title')!r} headline={(summary.get('headline') or '')[:60]!r}"
        )
        for job in summary.get("jobs") or []:
            print(f"                     - {job.get('title')} @ {job.get('company')}")

    dump["summaries"] = rows

    # Probe other product areas (1 call each) so we know plan access.
    probes = [
        (
            "person_search",
            "/person/search",
            {
                "filters": {
                    "field": "basic_profile.name",
                    "type": "=",
                    "value": "Abhilash Chowdhary",
                },
                "limit": 1,
            },
        ),
        (
            "web_search",
            "/web/search/live",
            {"query": "Crustdata YC F24", "limit": 3},
        ),
        (
            "live_person_enrich",
            "/person/professional_network/enrich/live",
            {
                "professional_network_profile_urls": ["https://www.linkedin.com/in/cheema-s"],
                "fields": ["basic_profile", "experience"],
            },
        ),
        (
            "social_post_search",
            "/social_post/professional_network/search/live",
            {"query": "internship expo", "limit": 1},
        ),
    ]
    for label, path, body in probes:
        status, payload, headers = request("POST", path, key, body)
        dump[label] = {
            "status": status,
            "credits_used": headers.get("x-credits-used"),
            "payload": payload if status != 200 else _truncate(payload),
        }
        print(f"\n=== {label} HTTP {status} credits={headers.get('x-credits-used')} ===")
        print(json.dumps(payload, indent=2)[:2000] if not isinstance(payload, str) else payload[:2000])

    (OUT / "results.json").write_text(json.dumps(dump, indent=2, default=str), encoding="utf-8")
    print(f"\nWrote {OUT / 'results.json'}")
    return 0


def _truncate(payload):
    text = json.dumps(payload, default=str)
    if len(text) > 20000:
        return json.loads(text[:20000] + '"}') if False else {"_truncated": True, "preview": text[:8000]}
    return payload


if __name__ == "__main__":
    raise SystemExit(main())
