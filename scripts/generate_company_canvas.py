"""Generate canvas + CSV from yc-expo-companies.json."""
from __future__ import annotations

import csv
import json
from pathlib import Path

ROOT = Path(r"C:\Users\Cheem\LarpSchool")
JSON_PATH = ROOT / "data" / "yc-expo-companies.json"
CSV_PATH = ROOT / "data" / "csv" / "10_yc_expo_companies.csv"
CANVAS_PATH = Path(
    r"C:\Users\Cheem\.cursor\projects\c-Users-Cheem-LarpSchool\canvases\yc-expo-companies.canvas.tsx"
)

KEEP = [
    "name",
    "batch",
    "stage",
    "one_liner",
    "website",
    "yc_url",
    "what_they_do",
    "who_they_hire",
    "intern_roles",
    "open_roles",
    "challenge",
    "challenge_url",
    "challenge_type",
    "fit",
    "talking_points",
]


def compact(c: dict) -> dict:
    out = {k: c.get(k) for k in KEEP}
    return out


def main() -> None:
    raw = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    companies = [compact(c) for c in raw["companies"]]
    CSV_PATH.parent.mkdir(parents=True, exist_ok=True)

    with CSV_PATH.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(
            [
                "name",
                "batch",
                "stage",
                "fit",
                "one_liner",
                "intern_roles",
                "open_roles",
                "challenge_type",
                "challenge",
                "challenge_url",
                "website",
                "yc_url",
                "who_they_hire",
                "talking_points",
            ]
        )
        for c in companies:
            w.writerow(
                [
                    c["name"],
                    c["batch"],
                    c["stage"],
                    c["fit"],
                    c["one_liner"],
                    " | ".join(c["intern_roles"] or []),
                    " | ".join(c["open_roles"] or []),
                    c["challenge_type"],
                    c["challenge"] or "",
                    c["challenge_url"] or "",
                    c["website"],
                    c["yc_url"],
                    c["who_they_hire"],
                    " | ".join(c["talking_points"] or []),
                ]
            )

    data_js = json.dumps(companies, ensure_ascii=False, indent=2)
    canvas = TEMPLATE.replace("__COMPANIES__", data_js)
    CANVAS_PATH.write_text(canvas, encoding="utf-8")
    print(f"wrote {CSV_PATH} ({len(companies)} rows)")
    print(f"wrote {CANVAS_PATH} ({len(canvas):,} chars)")


TEMPLATE = r'''import {
  Callout,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Grid,
  H1,
  H2,
  H3,
  Link,
  Pill,
  Row,
  Select,
  Stack,
  Stat,
  Table,
  Text,
  TextInput,
  useCanvasState,
} from "cursor/canvas";

type Fit = "high" | "medium" | "low";
type ChallengeType =
  | "public_challenge"
  | "interview_takehome"
  | "expo_sponsor"
  | "apply_with_artifact"
  | "none";

type Company = {
  name: string;
  batch: string;
  stage: string;
  one_liner: string;
  website: string;
  yc_url: string;
  what_they_do: string;
  who_they_hire: string;
  intern_roles: string[];
  open_roles: string[];
  challenge: string | null;
  challenge_url: string | null;
  challenge_type: ChallengeType;
  fit: Fit;
  talking_points: string[];
};

const COMPANIES: Company[] = __COMPANIES__;

const FIT_TONE: Record<Fit, "success" | "warning" | "danger" | undefined> = {
  high: "success",
  medium: "warning",
  low: "danger",
};

const CHALLENGE_LABEL: Record<ChallengeType, string> = {
  public_challenge: "Public challenge",
  interview_takehome: "Interview take-home",
  expo_sponsor: "Expo sponsor / on-site",
  apply_with_artifact: "Send an artifact",
  none: "No public challenge",
};

function hasIntern(c: Company): boolean {
  return c.intern_roles.length > 0;
}

function hasChallenge(c: Company): boolean {
  return c.challenge_type !== "none";
}

function matchesQuery(c: Company, q: string): boolean {
  if (!q.trim()) return true;
  const hay = [
    c.name,
    c.one_liner,
    c.what_they_do,
    c.who_they_hire,
    c.challenge ?? "",
    ...c.intern_roles,
    ...c.open_roles,
    ...c.talking_points,
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q.trim().toLowerCase());
}

export default function YcExpoCompanies() {
  const [query, setQuery] = useCanvasState("query", "");
  const [fitFilter, setFitFilter] = useCanvasState("fit", "all");
  const [lane, setLane] = useCanvasState("lane", "intern");
  const [selected, setSelected] = useCanvasState("selected", "Prox");

  const internCount = COMPANIES.filter(hasIntern).length;
  const highCount = COMPANIES.filter((c) => c.fit === "high").length;
  const challengeCount = COMPANIES.filter(hasChallenge).length;
  const publicCount = COMPANIES.filter((c) => c.challenge_type === "public_challenge").length;

  const filtered = COMPANIES.filter((c) => {
    if (!matchesQuery(c, query)) return false;
    if (fitFilter !== "all" && c.fit !== fitFilter) return false;
    if (lane === "intern" && !hasIntern(c)) return false;
    if (lane === "challenge" && !hasChallenge(c)) return false;
    if (lane === "high" && c.fit !== "high") return false;
    if (lane === "skip" && c.fit !== "low") return false;
    return true;
  });

  const selectedCo =
    COMPANIES.find((c) => c.name === selected) ??
    filtered[0] ??
    COMPANIES[0];

  const challengeRows = COMPANIES.filter(hasChallenge).map((c) => [
    <Link href={c.website}>{c.name}</Link>,
    c.batch,
    CHALLENGE_LABEL[c.challenge_type],
    c.challenge ?? "",
    c.challenge_url ? <Link href={c.challenge_url}>Open</Link> : "—",
  ]);

  const tableRows = filtered.map((c) => [
    <Pill
      size="sm"
      active={c.name === selectedCo.name}
      onClick={() => setSelected(c.name)}
    >
      {c.name}
    </Pill>,
    `${c.batch} · ${c.stage}`,
    c.fit,
    c.intern_roles[0] ?? (c.open_roles[0] ?? "—"),
    hasChallenge(c) ? CHALLENGE_LABEL[c.challenge_type] : "—",
    c.one_liner,
  ]);

  const tableTone = filtered.map((c) => FIT_TONE[c.fit]);

  return (
    <Stack gap={20}>
      <Stack gap={6}>
        <H1>YC Internship Expo — company intel</H1>
        <Text tone="secondary">
          Saturday Aug 15, 2026 · Dogpatch HQ · 51 attending companies plus Mount (expo challenge sponsor). Research saved Aug 14.
        </Text>
      </Stack>

      <Callout tone="warning" title="Tonight vs the LARP game">
        Ship this cheat sheet and the public challenges first. A peer-roast LARP is a fun side game; the expo itself is a hiring market. Highest leverage: Prox welder agent, Bluejay $6k bounty, Parrot 60s Loom, then Replit/CTGT/Garage/Mount on-site challenges.
      </Callout>

      <Grid columns={4} gap={12}>
        <Stat value={String(COMPANIES.length)} label="Companies researched" />
        <Stat value={String(highCount)} label="High student fit" tone="success" />
        <Stat value={String(internCount)} label="Explicit intern seats" tone="info" />
        <Stat value={`${publicCount} public / ${challengeCount} total`} label="Challenges or take-homes" tone="warning" />
      </Grid>

      <H2>Do these before or at the expo</H2>
      <Text tone="secondary" size="small">
        Source: company sites, YC pages, LinkedIn, and the official expo page. Public challenges beat a resume at seed booths.
      </Text>
      <Table
        headers={["Company", "Batch", "Type", "What to do", "Link"]}
        rows={challengeRows}
        rowTone={COMPANIES.filter(hasChallenge).map((c) =>
          c.challenge_type === "public_challenge"
            ? "success"
            : c.challenge_type === "expo_sponsor"
              ? "info"
              : "warning"
        )}
        striped
        stickyHeader
      />

      <H2>Booth planner</H2>
      <Row gap={8} wrap>
        <Pill active={lane === "intern"} onClick={() => setLane("intern")}>
          Intern seats
        </Pill>
        <Pill active={lane === "challenge"} onClick={() => setLane("challenge")}>
          Has a challenge
        </Pill>
        <Pill active={lane === "high"} onClick={() => setLane("high")}>
          High fit
        </Pill>
        <Pill active={lane === "all"} onClick={() => setLane("all")}>
          All 52
        </Pill>
        <Pill active={lane === "skip"} onClick={() => setLane("skip")}>
          Skip / low fit
        </Pill>
      </Row>
      <Row gap={8} wrap align="center">
        <TextInput
          value={query}
          onChange={setQuery}
          placeholder="Search name, role, talking point…"
          style={{ minWidth: 240 }}
        />
        <Select
          value={fitFilter}
          onChange={setFitFilter}
          options={[
            { value: "all", label: "Any fit" },
            { value: "high", label: "High fit" },
            { value: "medium", label: "Medium fit" },
            { value: "low", label: "Low fit" },
          ]}
        />
        <Select
          value={selected}
          onChange={setSelected}
          options={COMPANIES.map((c) => ({
            value: c.name,
            label: `${c.name} (${c.fit})`,
          }))}
        />
      </Row>
      <Text tone="tertiary" size="small">
        Showing {filtered.length} of {COMPANIES.length}. Click a name to load the booth card.
      </Text>

      <Grid columns="minmax(0, 1.4fr) minmax(280px, 0.9fr)" gap={16}>
        <Stack gap={10}>
          <H3>Filtered companies</H3>
          <Table
            headers={["Company", "Batch", "Fit", "Best seat", "Challenge", "One-liner"]}
            rows={tableRows}
            rowTone={tableTone}
            striped
            stickyHeader
            emptyMessage="No companies match these filters."
          />
        </Stack>

        <Card>
          <CardHeader trailing={<Pill size="sm">{selectedCo.fit} fit</Pill>}>
            {selectedCo.name}
          </CardHeader>
          <CardBody>
            <Stack gap={10}>
              <Text weight="semibold">
                {selectedCo.one_liner}
              </Text>
              <Text tone="secondary" size="small">
                {selectedCo.batch} · {selectedCo.stage} · {CHALLENGE_LABEL[selectedCo.challenge_type]}
              </Text>
              <Row gap={8} wrap>
                <Link href={selectedCo.website}>Website</Link>
                <Link href={selectedCo.yc_url}>YC page</Link>
                {selectedCo.challenge_url ? (
                  <Link href={selectedCo.challenge_url}>Challenge</Link>
                ) : null}
              </Row>
              <Divider />
              <Text size="small">{selectedCo.what_they_do}</Text>
              <Text size="small" weight="semibold">
                Who they hire
              </Text>
              <Text size="small" tone="secondary">
                {selectedCo.who_they_hire}
              </Text>
              {selectedCo.intern_roles.length > 0 ? (
                <Text size="small">Intern: {selectedCo.intern_roles.join(" · ")}</Text>
              ) : null}
              {selectedCo.open_roles.length > 0 ? (
                <Text size="small" tone="secondary">
                  Other: {selectedCo.open_roles.join(" · ")}
                </Text>
              ) : null}
              {selectedCo.challenge ? (
                <Callout tone="info" title="Challenge / loop">
                  {selectedCo.challenge}
                </Callout>
              ) : null}
              <Text size="small" weight="semibold">
                Say this at the booth
              </Text>
              {selectedCo.talking_points.map((p) => (
                <Text size="small" tone="secondary">
                  {p}
                </Text>
              ))}
            </Stack>
          </CardBody>
        </Card>
      </Grid>

      <H2>Skip unless you have a specific reason</H2>
      <Text tone="secondary" size="small">
        These booths are senior, remote-only, or not intern-shaped. Still useful if that is exactly your lane.
      </Text>
      <Table
        headers={["Company", "Why skip for a typical intern"]}
        rows={COMPANIES.filter((c) => c.fit === "low").map((c) => [
          c.name,
          c.who_they_hire,
        ])}
        rowTone={COMPANIES.filter((c) => c.fit === "low").map(() => "danger" as const)}
      />
    </Stack>
  );
}
'''

if __name__ == "__main__":
    main()
