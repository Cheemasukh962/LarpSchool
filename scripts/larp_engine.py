"""Extract battle cards, score them, and assemble roast/compliment verdicts.

No live API. Pre-score is O(n). A fight compares two cards and picks templates.
"""
from __future__ import annotations

import math
import random
import re
from typing import Any

# School and FAANG-tier work share the top bar (32 each).
# Davis + Apple should beat Berkeley with an empty work bar.
SCHOOL_T0 = [
    "massachusetts institute of technology",
    "stanford",
    "harvard",
    "caltech",
    "california institute of technology",
    "carnegie mellon",
    "berkeley",
    "university of waterloo",
    "princeton",
    "yale",
    "columbia university",
    "university of pennsylvania",
    "wharton",
    "eth zurich",
    "eth zürich",
    "university of oxford",
    "university of cambridge",
    "iit bombay",
    "iit delhi",
    "iit madras",
    "iit kanpur",
]
SCHOOL_T0_SHORT = ["mit", "cmu", "iit"]
SCHOOL_T1 = [
    "georgia institute of technology",
    "georgia tech",
    "urbana-champaign",
    "uiuc",
    "ucla",
    "ucsd",
    "university of michigan",
    "university of washington",
    "cornell",
    "duke",
    "northwestern",
    "rice university",
    "johns hopkins",
    "brown university",
    "new york university",
    "nyu",
    "ut austin",
    "university of texas at austin",
    "imperial college",
    "university of chicago",
]
HS_RE = re.compile(r"\b(high school|secondary school|academy of)\b", re.I)

# Hits the same max as T0 school. Classic FAANG + adjacent mega-shops.
FAANG_WORK = [
    "google",
    "meta",
    "facebook",
    "apple",
    "amazon",
    "microsoft",
    "netflix",
    "nvidia",
    "openai",
    "anthropic",
    "deepmind",
    "tesla",
    "spacex",
    "stripe",
    "jane street",
    "citadel",
    "two sigma",
    "palantir",
    "databricks",
    "goldman",
    "bloomberg",
]

COMPANY_PRESTIGE = [
    "google",
    "meta",
    "openai",
    "anthropic",
    "nvidia",
    "apple",
    "amazon",
    "microsoft",
    "stripe",
    "jane street",
    "citadel",
    "two sigma",
    "y combinator",
    "scale ai",
    "palantir",
    "tesla",
    "spacex",
    "databricks",
    "cursor",
    "perplexity",
    "netflix",
    "uber",
    "airbnb",
    "goldman",
    "bloomberg",
    "deepmind",
    "waymo",
    "anduril",
    "roblox",
    "snap",
    "figma",
    "notion",
    "cloudflare",
    "datadog",
    "snowflake",
    "huggingface",
    "xai",
    "crustdata",
    "relling",
    "sid.ai",
    "bild ai",
    "prox",
    "bluejay",
    "replit",
    "corgi",
    "mem0",
]

FOUNDER_RE = re.compile(
    r"\b(founder|co-?founder|ceo|cto|chief|founding (engineer|swe|designer)|owner)\b",
    re.I,
)
INCOMING_RE = re.compile(r"\bincoming\b", re.I)
STEALTH_RE = re.compile(r"\bstealth\b", re.I)
HACKATHON_RE = re.compile(
    r"hackathon|won |1st place|first place|prize|hackdavis|treehacks|calhacks|yc hack",
    re.I,
)
PIPE_RE = re.compile(r"\s\|\s")


def _s(val: Any) -> str:
    return str(val or "").strip()


def _lower(val: Any) -> str:
    return _s(val).lower()


def _clean_projects(raw: Any) -> list[dict]:
    out = []
    if not isinstance(raw, list):
        return out
    for item in raw:
        if not isinstance(item, dict):
            continue
        title = _s(item.get("title"))
        if not title:
            continue
        desc = _s(item.get("description"))
        out.append({"title": title, "description": desc[:280], "start_date": item.get("start_date")})
    return out


def _jobs_from_crust(person: dict | None) -> list[dict]:
    if not person:
        return []
    details = ((person.get("experience") or {}).get("employment_details") or {})
    jobs = []
    for bucket in ("current", "past"):
        for row in details.get(bucket) or []:
            if not isinstance(row, dict):
                continue
            jobs.append(
                {
                    "title": _s(row.get("title")),
                    "company": _s(row.get("name")),
                    "description": _s(row.get("description"))[:240],
                }
            )
    return jobs


def _schools_from_crust(person: dict | None) -> list[str]:
    if not person:
        return []
    names = []
    for row in (person.get("education") or {}).get("schools") or []:
        if isinstance(row, dict) and _s(row.get("school")):
            names.append(_s(row.get("school")))
    return names


def _prestige_hits(text: str, vocab: list[str]) -> list[str]:
    blob = _lower(text)
    hits = []
    for term in vocab:
        if term in hits:
            continue
        if len(term) <= 4:
            if re.search(rf"(^|[^a-z0-9]){re.escape(term)}([^a-z0-9]|$)", blob):
                hits.append(term)
        elif term in blob:
            hits.append(term)
    return hits


def extract_card(
    *,
    luma_row: dict,
    bd: dict | None,
    crust: dict | None,
    photo: dict | None,
) -> dict:
    profile = (bd or {}).get("profile") or {}
    person = (crust or {}).get("person_data") or {}
    basic = person.get("basic_profile") or {}

    projects = _clean_projects(profile.get("projects"))
    jobs = _jobs_from_crust(person)
    school = _s(profile.get("educations_details"))
    crust_schools = _schools_from_crust(person)
    bd_schools = [
        _s(row.get("title"))
        for row in (profile.get("education") or [])
        if isinstance(row, dict) and _s(row.get("title"))
    ]
    if not school and bd_schools:
        school = bd_schools[0]
    if not school and crust_schools:
        school = crust_schools[0]

    company = _s(profile.get("current_company_name")) or _s(
        (profile.get("current_company") or {}).get("name")
    )
    if not company and jobs:
        company = jobs[0].get("company") or ""

    headline = _s(basic.get("headline")) or _s(profile.get("position")) or _s(luma_row.get("bio"))
    title = _s(basic.get("current_title"))
    about = _s(basic.get("summary")) or _s(profile.get("about"))
    followers = int(profile.get("followers") or 0)
    connections = int(profile.get("connections") or 0)
    name = _s(profile.get("name")) or _s(basic.get("name")) or _s(luma_row.get("name"))

    blob = " ".join(
        [
            headline,
            title,
            company,
            school,
            about,
            " ".join(p["title"] + " " + p["description"] for p in projects),
            " ".join((j["title"] + " " + j["company"]) for j in jobs),
            _s(luma_row.get("bio")),
        ]
    )

    return {
        "id": _s(luma_row.get("luma_user_id")),
        "name": name,
        "linkedin": _s(luma_row.get("linkedin")),
        "bio": _s(luma_row.get("bio")),
        "website": _s(luma_row.get("website")),
        "twitter": _s(luma_row.get("twitter")),
        "school": school,
        "schools": [s for s in ([school] + bd_schools + crust_schools) if s],
        "company": company,
        "headline": headline[:180],
        "title": title,
        "about": about[:400],
        "followers": followers,
        "connections": connections,
        "projects": projects[:6],
        "project_count": len(projects),
        "jobs": jobs[:6],
        "job_count": len(jobs),
        "photo_file": (photo or {}).get("photo_file") if photo and photo.get("status") == "saved" else None,
        "has_photo": bool(photo and photo.get("status") == "saved"),
        "source": "crustdata" if crust and not profile.get("name") else ("brightdata" if profile else "empty"),
        "blob": blob,
    }


def school_tier(school: str, blob: str = "") -> tuple[str, int]:
    """Return (tier, points). Max 32. School field only — never projects/headline."""
    del blob  # old callers passed the whole profile blob; that matched MIT-licensed etc.
    text = school or ""
    if _prestige_hits(text, SCHOOL_T0) or _prestige_hits(text, SCHOOL_T0_SHORT):
        return "T0", 32
    if _prestige_hits(text, SCHOOL_T1):
        return "T1", 22
    if HS_RE.search(text):
        return "HS", 4
    if _s(text):
        return "T2", 14
    return "none", 0


def work_score(card: dict, faang_hits: list[str], company_hits: list[str]) -> int:
    """Max 32. FAANG-tier work equals T0 school. Other named shops sit a step under."""
    company = card.get("company") or ""
    title = f"{card.get('title') or ''} {card.get('headline') or ''}"
    named = bool(company) and not STEALTH_RE.search(company)
    founder = bool(FOUNDER_RE.search(title) or FOUNDER_RE.search(company))
    if faang_hits:
        return 32
    if company_hits:
        return 24
    if founder and named:
        return 20
    if named:
        return 16
    if STEALTH_RE.search(company) or STEALTH_RE.search(title):
        return 6
    if card.get("job_count"):
        return 10
    return 0


def presence_score(followers: int, has_site: bool) -> int:
    """Max 26. Log curve so 1k is already strong, 20k saturates."""
    pts = int(math.log10(followers + 1) * 6.5)
    if has_site:
        pts += 3
    return max(0, min(26, pts))


def project_score(projects: list[dict]) -> tuple[int, int, int]:
    """Max 10. Small on purpose — LinkedIn projects are missing for most people."""
    described = [p for p in projects if len(p.get("description") or "") >= 40]
    hackathons = sum(
        1
        for p in projects
        if HACKATHON_RE.search((p.get("title") or "") + " " + (p.get("description") or ""))
    )
    pts = min(8, len(described) * 2) + min(2, hackathons)
    return min(10, pts), len(described), hackathons


def score_card(card: dict) -> dict:
    blob = card.get("blob") or ""
    projects = card.get("projects") or []
    jobs = card.get("jobs") or []
    followers = int(card.get("followers") or 0)
    work_text = " ".join(
        [
            card.get("company") or "",
            " ".join(j.get("company") or "" for j in jobs),
        ]
    )
    faang_hits = _prestige_hits(work_text, FAANG_WORK)
    company_hits = _prestige_hits(work_text, COMPANY_PRESTIGE)
    tier, school_pts = school_tier(card.get("school") or "")
    work_pts = work_score(card, faang_hits, company_hits)
    presence_pts = presence_score(followers, bool(card.get("website")))
    proj_pts, described_n, hackathons = project_score(projects)

    named_company = bool(card.get("company")) and not STEALTH_RE.search(card.get("company") or "")
    tags: list[str] = [f"school_{tier.lower()}"]
    if FOUNDER_RE.search(blob):
        tags.append("founder_title")
    if STEALTH_RE.search(blob):
        tags.append("stealth")
    if faang_hits:
        tags.append("faang")
    if company_hits:
        tags.append("prestige_shop")
    if hackathons:
        tags.append("hackathon")
    if described_n >= 3:
        tags.append("shipper")
    if not card.get("school") and not card.get("company") and described_n == 0:
        tags.append("empty_card")
    if INCOMING_RE.search(blob):
        tags.append("incoming")
    if len(PIPE_RE.findall(card.get("headline") or "")) >= 2:
        tags.append("headline_stuffed")

    flex = max(0, min(100, school_pts + work_pts + presence_pts + proj_pts))
    larp_index = max(
        0,
        min(
            100,
            (12 if "stealth" in tags else 0)
            + (8 if "founder_title" in tags and "shipper" not in tags else 0)
            + (10 if "incoming" in tags else 0)
            + (8 if "headline_stuffed" in tags else 0),
        ),
    )

    highlights = []
    if card.get("school"):
        highlights.append(card["school"])
    if card.get("company"):
        highlights.append(card["company"])
    if card.get("title"):
        highlights.append(card["title"])
    if described_n and projects:
        highlights.append(projects[0]["title"])

    return {
        "flex_score": flex,
        "larp_index": larp_index,
        "school_tier": tier,
        "breakdown": {
            "school": school_pts,
            "work": work_pts,
            "presence": presence_pts,
            "projects": proj_pts,
        },
        "tags": sorted(set(tags)),
        "company_hits": company_hits[:4],
        "highlights": highlights[:4],
        "hackathon_projects": hackathons,
        "described_projects": described_n,
    }


def _pick(rng: random.Random, options: list[str]) -> str:
    return rng.choice(options)


def compliment_line(card: dict, scored: dict, rng: random.Random) -> str:
    name = card["name"] or "this battler"
    school = card.get("school") or ""
    company = card.get("company") or ""
    followers = int(card.get("followers") or 0)
    n = scored.get("described_projects") or 0
    tags = scored["tags"]
    if "faang" in tags and company:
        return _pick(
            rng,
            [
                f"{name} has a real shop on the card: {company}. That still prints.",
                f"{company} on a YC intern LinkedIn is cheating, and {name} did it anyway.",
            ],
        )
    if "school_t0" in tags and school:
        return _pick(
            rng,
            [
                f"{name} brought {school} to a LinkedIn fight. Cheap. Effective.",
                f"{school} does a lot of work on {name}'s behalf. Enjoy it.",
            ],
        )
    if "prestige_shop" in tags and company:
        return _pick(
            rng,
            [
                f"{name} has a real shop on the card: {company}. That still prints.",
                f"{company} on a YC intern LinkedIn is cheating, and {name} did it anyway.",
            ],
        )
    if "school_t1" in tags and school:
        return f"{name} is at {school}. Not T0, still a real card."
    if followers >= 1500:
        return f"{name} has {followers} followers. Presence is not a side quest."
    if "shipper" in tags and n:
        return _pick(
            rng,
            [
                f"{name} actually shipped {n} things with descriptions. In this room that is a flex.",
                f"{name} has project writeups. Not just a logo row. Respect.",
            ],
        )
    if "hackathon" in tags:
        return f"{name} has hackathon residue on the profile. At this expo that is native language."
    if card.get("job_count") or company:
        return f"{name} at least has a job on the card, which already puts them in the top half of this dataset."
    if school:
        return f"{name} showed up with a school name. Bare minimum. Still a compliment."
    return f"{name} is in the arena. Half the internet is not."


def roast_line(card: dict, scored: dict, rng: random.Random) -> str:
    name = card["name"] or "this battler"
    tags = scored["tags"]
    headline = card.get("headline") or ""
    named_co = bool(card.get("company")) and not STEALTH_RE.search(card.get("company") or "")
    if "empty_card" in tags:
        return _pick(
            rng,
            [
                f"{name}'s LinkedIn is a blank character sheet with 500 connections.",
                f"{name} RSVP'd to YC with the energy of an unclaimed username.",
                f"{name} brought vibes. The dataset brought nothing.",
            ],
        )
    if "stealth" in tags:
        return _pick(
            rng,
            [
                f"{name} is building in stealth, which is LinkedIn for 'there is no product.'",
                f"{name}'s company is Stealth. The stealth is the traction.",
            ],
        )
    if "incoming" in tags:
        return _pick(
            rng,
            [
                f"{name}'s headline is 40% the word incoming. Live in the present tense.",
                f"{name} is incoming at everyone. The internship has not incoming'd back.",
            ],
        )
    if "headline_stuffed" in tags:
        return _pick(
            rng,
            [
                f"{name}'s headline has more pipes than a plumber. '{headline[:90]}'",
                f"{name} treated the headline like a LinkedIn SEO dump. We can still see you.",
            ],
        )
    if "founder_title" in tags and "shipper" not in tags and (card.get("job_count") or 0) < 2 and not named_co:
        return _pick(
            rng,
            [
                f"{name} is a founder the way a group chat is a startup.",
                f"{name} put Founder in the title and then forgot to found.",
            ],
        )
    if "followers_no_build" in tags and (card.get("job_count") or 0) < 2:
        return f"{name} has {card.get('followers')} followers and zero project writeups. Influencer arc, intern booth."
    if scored.get("described_projects", 0) == 0 and card.get("project_count", 0) == 0 and (card.get("job_count") or 0) < 2:
        return _pick(
            rng,
            [
                f"{name} has no projects listed. At a YC intern expo that is a silent film.",
                f"{name} is fighting with school + vibes. Bold strategy.",
            ],
        )
    if "school_t0" in tags and scored.get("described_projects", 0) == 0 and (card.get("job_count") or 0) < 2:
        return f"{name} is letting {card.get('school')} do all the talking. The school would like a word."
    return _pick(
        rng,
        [
            f"{name} is mid-larp: enough signal to enter, not enough to swagger.",
            f"{name} would win a networking event and lose a readme contest.",
            f"{name} is one 'building in public' post away from a complete character.",
        ],
    )


def enrich_card(card: dict) -> dict:
    scored = score_card(card)
    rng = random.Random(card.get("id") or card.get("name") or "x")
    card = {**card}
    card.pop("blob", None)
    card.update(scored)
    card["compliment"] = compliment_line(card, scored, rng)
    card["roast"] = roast_line(card, scored, rng)
    return card


def battle(a: dict, b: dict) -> dict:
    """Deterministic matchup. Winner is higher flex_score; tie goes to lower larp_index, then name."""
    seed = "|".join(sorted([a["id"], b["id"]]))
    rng = random.Random(seed)

    def key(c: dict) -> tuple:
        return (c["flex_score"], -c["larp_index"], c["name"] or "")

    winner, loser = (a, b) if key(a) >= key(b) else (b, a)
    margin = abs(a["flex_score"] - b["flex_score"])
    if margin >= 20:
        tone = "it was not close"
    elif margin >= 8:
        tone = "a clean hit"
    else:
        tone = "a photo-finish between two LinkedIn mains"

    verdict = (
        f"{winner['name']} beats {loser['name']} {winner['flex_score']}-{loser['flex_score']} — {tone}. "
        f"{winner['compliment']} {loser['roast']}"
    )
    if winner["larp_index"] >= 40:
        verdict += " " + _pick(
            rng,
            [
                f"Judge's note: {winner['name']} still larps. They just larp with better receipts.",
                f"{winner['name']} won the flex and kept the bit. Dual citizenship in reality and LinkedIn.",
            ],
        )
    return {
        "winner_id": winner["id"],
        "loser_id": loser["id"],
        "winner_name": winner["name"],
        "loser_name": loser["name"],
        "winner_score": winner["flex_score"],
        "loser_score": loser["flex_score"],
        "margin": margin,
        "verdict": verdict,
        "winner_compliment": winner["compliment"],
        "loser_roast": loser["roast"],
    }
