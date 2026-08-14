"""Build Crossy Road question bank from yc-expo-companies.json."""
from __future__ import annotations

import json
import random
from pathlib import Path

ROOT = Path(r"C:\Users\Cheem\LarpSchool")
SRC = ROOT / "data" / "yc-expo-companies.json"
OUT = ROOT / "data" / "crossy-questions.json"

rng = random.Random(51)


def shuffle_choices(correct: str, distractors: list[str]) -> tuple[list[str], int]:
    opts = [correct]
    for d in distractors:
        if d and d != correct and d not in opts:
            opts.append(d)
        if len(opts) == 4:
            break
    while len(opts) < 4:
        opts.append(f"(placeholder {len(opts)})")
    rng.shuffle(opts)
    return opts, opts.index(correct)


def q(qid: str, company: str, prompt: str, correct: str, distractors: list[str], explain: str, kind: str) -> dict:
    choices, idx = shuffle_choices(correct, distractors)
    return {
        "id": qid,
        "company": company,
        "kind": kind,
        "prompt": prompt,
        "choices": choices,
        "answer_index": idx,
        "explain": explain,
    }


def main() -> None:
    data = json.loads(SRC.read_text(encoding="utf-8"))
    companies = [c for c in data["companies"] if c["name"] != "Mount" or True]
    names = [c["name"] for c in companies]
    liners = {c["name"]: c["one_liner"] for c in companies}

    def other_names(exclude: str, n: int = 8) -> list[str]:
        pool = [x for x in names if x != exclude]
        rng.shuffle(pool)
        return pool[:n]

    def other_liners(exclude: str, n: int = 8) -> list[str]:
        pool = [liners[x] for x in names if x != exclude]
        rng.shuffle(pool)
        return pool[:n]

    questions: list[dict] = []

    # --- curated: challenges, traps, intern facts that actually help at the booth ---
    curated = [
        q("prox-challenge", "Prox",
          "Prox's internship/founding filter is:",
          "Clone a public welder-agent repo and submit it — no resume screen",
          ["A 45-minute LeetCode screen", "A 60-second Loom to the founders", "A 3-hour take-home on B2B data APIs"],
          "Prox: github.com/prox-technologies/prox-challenge then useprox.com/join.",
          "challenge"),
        q("bluejay-bounty", "Bluejay",
          "Bluejay is paying a public bounty for work on their product. What is Bluejay?",
          "Test, monitor, and improve voice and chat AI agents",
          ["AI technical support for welders", "TikTok for language learning", "Memory layer for AI agents"],
          "getbluejay.ai/bounty — $2k/agent, $6k total. SWE intern is posted.",
          "challenge"),
        q("parrot-loom", "Parrot",
          "How do you actually apply to Parrot (TikTok for language learning)?",
          "Send a 60-second Loom to founders@parrotapp.com",
          ["Clone their GitHub welder challenge", "Finish a 48-hour take-home", "Show up with a resume only"],
          "The Loom is the application, not a nice-to-have.",
          "challenge"),
        q("nowadays-dining", "Nowadays",
          "Nowadays' expo puzzle (deadline tonight) is about:",
          "Finding trusted private dining for groups of 30–200 people",
          ["Uranium exploration models", "Mainframe COBOL agents", "Hotel operations agents"],
          "nowadays.ai/careers/yc — React + Tailwind + Supabase. Top 5 get an intern interview and dinner.",
          "challenge"),
        q("hypercubic-hopper", "Hypercubic",
          "Hypercubic wants you to try Hopper before the booth. Hopper is:",
          "A public demo of their mainframe/COBOL agent",
          ["A voice-agent bounty form", "An in-browser IDE", "A uranium drill planner"],
          "hypercubic.ai/hopper — founding SWE, new-grad friendly.",
          "challenge"),
        q("replit-onsite", "Replit",
          "At this expo, Replit is mainly useful because they:",
          "Sponsor an on-site coding challenge with guaranteed interviews",
          ["Only hire senior full-stack with 3+ years", "Are a consumer language-learning app", "Build police report software"],
          "events.ycombinator.com/2027-summer-internship-expo — also CTGT, Garage, Mount.",
          "challenge"),
        q("laminar-trap", "Laminar",
          "Laminar (F24) at this expo is:",
          "Salesforce DevOps agents — not the LLM observability company lmnr.ai",
          ["The memory layer for AI agents", "An in-browser IDE", "AI for air traffic control"],
          "Easy name collision. 8+ years typical. Skip unless that is your lane.",
          "trap"),
        q("givecampus-skip", "GiveCampus",
          "GiveCampus is a bad first booth for most students because:",
          "Growth-stage school fundraising, 3+ years experience, no intern posting",
          ["They only hire PhD geoscientists", "They require a 60-second Loom", "They are NYC-only"],
          "DC-rooted, ~130 people. Real company, wrong intern shape.",
          "trap"),
        q("crustdata-what", "Crustdata",
          "Crustdata sells:",
          "Real-time people and company data via APIs",
          ["Personal AI robots", "AI estimating for doors and frames", "Insomnia treatment"],
          "AI intern track uses a 3-hour assignment. CEO Abhilash is at the expo.",
          "product"),
        q("mem0-what", "Mem0",
          "Mem0 is:",
          "The memory layer for AI agents",
          ["Unified agent infrastructure (that's Naïve)", "Meeting notes (that's Circleback)", "Chip design in minutes (that's Partcl)"],
          "Easy to mix with Naïve, Circleback, and Moda. Ask about intern take-home: local voice-controlled agent.",
          "trap"),
        q("naive-what", "Naïve",
          "Naïve (P25) is building:",
          "Unified agent infrastructure",
          ["The memory layer for AI agents", "Communication/email for agents", "Continual learning for agents"],
          "Naïve = infra. Mem0 = memory. primitive = email. Moda = continual learning.",
          "trap"),
        q("sid-what", "SID",
          "SID is:",
          "An AI research lab for retrieval",
          ["AI coworkers for fraud teams", "AI for air traffic control", "A rare-coin marketplace"],
          "Co-founder Lotte Seifert is on the guest list. Research intern summer 2026.",
          "product"),
        q("terranox-what", "Terranox AI",
          "Terranox AI is not a SaaS dashboard company. They:",
          "Use AI to find uranium deposits for the nuclear buildout",
          ["Run hotel operations with agents", "Stream database data to warehouses", "Sell voice-agent evals"],
          "Fall AI/ML intern vs Summer applied-science (MSc/PhD).",
          "product"),
        q("bild-what", "Bild AI",
          "Bild AI's wedge is:",
          "AI estimating and detailing for Division 8 doors, frames, and hardware",
          ["AI for air traffic control", "Fundraising for schools", "Marketplace for fire trucks"],
          "Narrow construction vertical. AI/SWE intern posted. Founder Puneet is at the expo.",
          "product"),
        q("codefour-what", "Code Four",
          "Code Four is:",
          "Modernizing the police workflow (reports, bodycam, case search)",
          ["Test/monitor voice AI agents", "Personal AI robots", "CBT-I for insomnia"],
          "Founding fullstack, 3+ years. Not a typical intern booth.",
          "product"),
        q("effigov-intern", "EffiGov",
          "EffiGov's Fall 2026 SWE intern is roughly paid:",
          "$5–7k per month",
          ["Unpaid for equity", "$10k/mo like hillclimb research interns", "Only a stipend plus dinner"],
          "Voice 311 for cities. Founding-adjacent intern seat.",
          "intern"),
        q("hillclimb-pay", "hillclimb",
          "hillclimb's research/SWE intern posting is notable because:",
          "It pays about $10k/month",
          ["It is unpaid", "It is NYC-only", "It requires 8 years of Salesforce"],
          "Training data for recursive self-improvement. Research-shaped.",
          "intern"),
        q("garage-geo", "Garage",
          "Garage (marketplace for fire trucks and essential assets) is based in:",
          "New York City",
          ["San Francisco", "Atlanta", "Boston"],
          "Expo sponsor + intern take-home, but the job is NYC.",
          "trap"),
        q("pure-geo", "Pure",
          "Pure (rare coins and precious metals marketplace) is based in:",
          "Los Angeles",
          ["San Francisco", "New York City", "Washington, DC"],
          "Product engineering intern Summer 2027 is listed.",
          "trap"),
        q("parameter-what", "Parameter (fka Hex Security)",
          "Parameter (fka Hex Security) builds:",
          "Agentic offensive security at scale",
          ["AI agents for collections", "Fundraising software for schools", "In-browser IDE"],
          "New-grad MTS is in play. Security-shaped.",
          "product"),
        q("artie-what", "Artie",
          "Artie streams:",
          "Data from databases to warehouses in real time (CDC)",
          ["Voice agents to hotel front desks", "Uranium drill plans to geologists", "Short-form language videos"],
          "Senior/product SWE, no intern. Skip for most students.",
          "product"),
        q("relling-what", "Relling",
          "Relling's one-liner is:",
          "Deploying the first billion robots for manufacturing",
          ["Personal AI robots for the home", "Tesla autonomous manufacturing cells for everyone", "Hotel operations agents"],
          "Don't mix with Innate (home robots) or Industrial Next (factory cells). CEO Jai Relan is at the expo.",
          "trap"),
        q("innate-what", "Innate",
          "Innate is building:",
          "Personal AI robots",
          ["Manufacturing robots", "Hotel ops agents", "Mainframe agents"],
          "YC lists a marketing intern more than a robotics intern.",
          "product"),
        q("industrial-next-what", "Industrial Next",
          "Industrial Next's pitch is:",
          "Tesla-style autonomous manufacturing for everyone",
          ["Personal home robots", "The first billion manufacturing robots (Relling)", "Division 8 construction takeoff"],
          "CEO Lukas Pankau is at the expo. Senior research, weak intern posting.",
          "trap"),
        q("lance-what", "Lance",
          "Lance builds AI agents that:",
          "Run hotel operations",
          ["Book private dining for 200 people", "Route engineering tickets", "Monitor voice agents"],
          "Founding SWE new-grads + SWE intern + GTM intern.",
          "product"),
        q("circleback-what", "Circleback",
          "Circleback is:",
          "AI meeting notes and automations",
          ["Self-driving observability for agents", "The memory layer for agents", "Fraud review agents"],
          "SWE intern Summer 2027 is posted.",
          "product"),
        q("respan-what", "Respan",
          "Respan (ex Keywords AI) is:",
          "Observability, evals, and a gateway for AI agents",
          ["AI meeting notes", "B2B people data APIs", "School fundraising"],
          "Frontend fall co-op intern is posted.",
          "product"),
        q("weave-what", "Weave",
          "Weave uses AI to:",
          "Understand and then route engineering work",
          ["Route 311 city calls", "Route hotel housekeeping", "Route collections calls"],
          "Product engineer intern + take-home + paid work trial.",
          "product"),
        q("afterquery-what", "AfterQuery",
          "AfterQuery is:",
          "An applied lab that curates expert data for foundation models",
          ["Frontier coding data for training LLMs (Datacurve)", "Training data for recursive self-improvement (hillclimb)", "Interactive-AI data (Velvet)"],
          "Three data companies at one expo. AfterQuery = expert/RLHF data. Datacurve = coding data. hillclimb = RSI data.",
          "trap"),
        q("datacurve-what", "Datacurve",
          "Datacurve produces:",
          "Frontier coding data for training and evaluating LLMs",
          ["Expert domain data for foundation labs", "RSI / self-improvement training data", "AV data for interactive AI"],
          "Historical take-home: takehome.datacurve.ai — confirm if still live.",
          "trap"),
        q("velvet-what", "Velvet",
          "Velvet is:",
          "Infra and data for interactive AI (often AV / world data)",
          ["In-browser IDE", "Rare coin marketplace", "Police workflow software"],
          "Founding ML, new-grad friendly. Founder said they are hiring interns at the expo.",
          "product"),
        q("partcl-what", "Partcl",
          "Partcl's product is:",
          "Design a chip in minutes (GPU EDA)",
          ["Personal AI robots", "Mainframe modernization", "Air traffic control AI"],
          "Founding systems+ML and EDA compiler. New grads if you can talk compilers.",
          "product"),
        q("enhanced-radar-what", "Enhanced Radar",
          "Enhanced Radar builds:",
          "AI for air traffic control",
          ["AI OS for cities", "AI for Division 8 construction", "AI for fraud review"],
          "Tiny team. Email join@enhancedradar.com.",
          "product"),
        q("clipboard-what", "Clipboard",
          "Clipboard Health's consumer one-liner is:",
          "Every shift, Covered. (healthcare staffing)",
          ["Every meeting, noted.", "Every hotel, staffed.", "Every city 311 call, answered."],
          "~1000 people. Engineering intern + TSE case study.",
          "product"),
        q("corgi-what", "Corgi Insurance",
          "Corgi is building:",
          "An AI financial infrastructure / insurance carrier",
          ["A rare-coin marketplace", "Collections voice agents only", "A school fundraising platform"],
          "Unicorn-scale. Intern listing looks stale; work trial is the real loop.",
          "product"),
        q("domu-what", "Domu",
          "Domu builds AI agents for:",
          "Collections",
          ["Hotel operations", "Fraud review", "Police reports"],
          "Co-founder Nico Diaz is at the expo. SWE seats are Brazil / South Africa / senior SF.",
          "product"),
        q("veritus-what", "Veritus",
          "Veritus builds AI agents for:",
          "Consumer lending",
          ["Collections (Domu)", "Insurance (Corgi)", "Fraud investigations (Variance)"],
          "FDE + fullstack, new grads possible.",
          "trap"),
        q("variance-what", "Variance",
          "Variance builds:",
          "AI agents for fraud review and investigations",
          ["AI coworkers for fraud/compliance (Socratix)", "Collections agents (Domu)", "Offensive security agents (Parameter)"],
          "Series A. Research/evals. No intern listing.",
          "trap"),
        q("primitive-what", "primitive",
          "primitive is:",
          "Communication / email infrastructure for agents",
          ["Unified agent infra (Naïve)", "Memory for agents (Mem0)", "Continual learning (Moda)"],
          "Demo their MCP. Founding DevRel / 'anything' new grads.",
          "trap"),
        q("moda-what", "Moda",
          "Moda is:",
          "The continual learning layer for AI agents",
          ["Memory layer (Mem0)", "Observability gateway (Respan)", "Meeting notes (Circleback)"],
          "No jobs posted. Still useful as a quiz fact so you don't pitch the wrong booth.",
          "trap"),
        q("aemon-what", "Aemon",
          "Aemon's one-liner is:",
          "The Forward-Deployed AI Research Engineer",
          ["Forward-deployed engineer at Prox", "AI R&D as a productized role/company", "A chip-design copilot"],
          "One elite MTS intern 2027, $8–15k. Contest-kid shaped.",
          "product"),
        q("koyal-what", "Koyal",
          "Koyal is:",
          "An agentic AI filmmaking platform",
          ["TikTok for language learning", "Play-your-story interactive fiction", "AI ads / marketing ops"],
          "Founding engineer. Video-gen, not a generic intern booth.",
          "product"),
        q("yn-what", "Y/n",
          "Y/n's consumer product is:",
          "Play your story (interactive stories)",
          ["TikTok for language learning", "Agentic filmmaking", "Meeting notes"],
          "Founding eng + SWE. Possible take-home.",
          "product"),
        q("surface-what", "Surface Labs",
          "Surface Labs is building:",
          "An AI marketing-ops platform (site → content/ads)",
          ["School fundraising", "B2B people data APIs", "Voice-agent evals"],
          "Three intern tracks: content, ads, GTM.",
          "product"),
        q("allus-what", "Allus AI",
          "Allus AI (Atlanta) is:",
          "A vision foundation model for manufacturing",
          ["Personal home robots", "Uranium discovery", "Chip EDA"],
          "SWE internship posted. Not SF-only.",
          "product"),
        q("ctgt-what", "CTGT",
          "CTGT is:",
          "The deterministic / interpretability layer for frontier intelligence",
          ["In-browser IDE", "Agent memory", "Hotel ops agents"],
          "Expo sponsor. Research intern: apply with one paper or repo. SWE intern Summer 2027.",
          "product"),
        q("dedalus-what", "Dedalus Labs",
          "Dedalus Labs is:",
          "A compute substrate / VMs for AI agents",
          ["Email infra for agents", "People-data APIs", "Salesforce DevOps"],
          "PM / Growth / Systems intern Summer 2027. Expo popup.",
          "product"),
        q("mount-what", "Mount",
          "Mount (not on the original 51, but an expo challenge sponsor) is:",
          "AI agent insurance",
          ["Trucking insurance at Corgi", "Collections agents", "School fundraising"],
          "On-site challenge sponsor with Replit / CTGT / Garage.",
          "product"),
        q("parahelp-what", "Parahelp",
          "Parahelp builds:",
          "An AI support agent that can use all of a company's tools",
          ["AI tech support for physical products (Prox)", "Voice-agent testing (Bluejay)", "Fraud coworkers (Socratix)"],
          "Series A. No open intern listing — still a useful booth if you want support-agents.",
          "product"),
        q("soren-what", "Soren",
          "Soren's 'specialized AI for real-world deployment' means:",
          "Private AI for regulated SMBs (banks, law firms) that cannot use public models",
          ["Robots on a factory floor", "Uranium drilling", "Police bodycam reports"],
          "SWE intern + growth intern + founding eng.",
          "product"),
        q("stellar-what", "Stellar Sleep",
          "Stellar Sleep helps people with chronic insomnia using:",
          "Psychology / CBT-I, not a gadget",
          ["A wearable sleep robot", "An AI meeting-notes app", "A voice agent that calls 311"],
          "Boston. Founding PE take-home. Intern path unofficial.",
          "product"),
        q("prox-what", "Prox",
          "Prox is:",
          "AI technical support for complex physical products (welders, manuals, schematics)",
          ["AI support agents that use SaaS tools (Parahelp)", "Voice-agent evals (Bluejay)", "Hotel ops agents (Lance)"],
          "Physical products, not Zendesk wrappers.",
          "trap"),
    ]
    questions.extend(curated)

    # --- generated: match one-liner to company (teaches names) ---
    for c in companies:
        name = c["name"]
        liner = c["one_liner"]
        questions.append(
            q(
                f"liner-{name.lower().replace(' ', '-')[:40]}",
                name,
                f"Which attending company is this: “{liner}”",
                name,
                other_names(name),
                f"{name} ({c['batch']}, {c['stage']}).",
                "identify",
            )
        )

    # intern seat questions where they exist
    for c in companies:
        roles = c.get("intern_roles") or []
        if not roles:
            continue
        name = c["name"]
        correct = f"{name}: {roles[0]}"
        distractors = []
        for other in companies:
            if other["name"] == name:
                continue
            oroles = other.get("intern_roles") or []
            if oroles:
                distractors.append(f"{other['name']}: {oroles[0]}")
        rng.shuffle(distractors)
        questions.append(
            q(
                f"intern-{name.lower().replace(' ', '-')[:40]}",
                name,
                "Which intern posting belongs to which company?",
                correct,
                distractors,
                c.get("who_they_hire") or liner,
                "intern",
            )
        )

    # de-dupe by id
    seen = set()
    uniq = []
    for item in questions:
        if item["id"] in seen:
            continue
        if "(placeholder" in str(item["choices"]):
            continue
        seen.add(item["id"])
        uniq.append(item)

    rng.shuffle(uniq)
    payload = {
        "generated_at": "2026-08-14",
        "event": "YC Startup Internship Expo Aug 15 2026",
        "step_interval": 10,
        "count": len(uniq),
        "kinds": sorted({x["kind"] for x in uniq}),
        "questions": uniq,
    }
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {len(uniq)} questions -> {OUT}")
    from collections import Counter
    print(Counter(x["kind"] for x in uniq))


if __name__ == "__main__":
    main()
