/**
 * Browser smoke test: walks the whole game once in real Chrome and fails on any console
 * error, page error, or failed request.
 *
 * Uses puppeteer-core against the locally installed Chrome so nothing downloads a browser.
 *   npm run dev
 *   npm run test:flow -- --url http://localhost:3001
 *
 * Flags: --url <base>  --headful  --screenshot <path>  --shots <dir>
 */
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
};

const BASE = flag("url", process.env.SMOKE_URL ?? "http://localhost:3000");
const HEADFUL = args.includes("--headful");
const SHOT = flag("screenshot", null);
const SHOTS = flag("shots", null);
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const CHROME_PATHS = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);

const executablePath = CHROME_PATHS.find((p) => existsSync(p));
if (!executablePath) {
  console.error("No Chrome found. Set CHROME_PATH to a Chrome or Edge binary.");
  process.exit(1);
}

/** Noise that says nothing about our code: devtools probes and dev-server HMR artifacts. */
const IGNORED = [/favicon/i, /\/json\/version/i, /React DevTools/i, /hot-update/i, /_next\/static\/webpack/i];
const ignorable = (text) => IGNORED.some((re) => re.test(text));

const problems = [];
const steps = [];
const ok = (msg) => steps.push(msg);

const browser = await puppeteer.launch({
  executablePath,
  headless: !HEADFUL,
  defaultViewport: { width: 402, height: 900, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
});

try {
  const page = await browser.newPage();

  page.on("console", (msg) => {
    // Resource errors log a generic message, so judge them by their location too.
    const where = msg.location()?.url ?? "";
    if (msg.type() === "error" && !ignorable(msg.text()) && !ignorable(where)) {
      problems.push(`console: ${msg.text()}${where ? ` (${where})` : ""}`);
    }
  });
  page.on("pageerror", (err) => problems.push(`pageerror: ${err.message}`));
  page.on("requestfailed", (req) => {
    if (!ignorable(req.url())) problems.push(`requestfailed: ${req.url()} ${req.failure()?.errorText}`);
  });
  page.on("response", (res) => {
    if (res.status() >= 400 && !ignorable(res.url())) problems.push(`http ${res.status()}: ${res.url()}`);
  });

  const screenText = () => page.evaluate(() => document.body.innerText.replace(/\s+/g, " ").toUpperCase());
  const settle = (ms = 350) => new Promise((r) => setTimeout(r, ms));

  /**
   * Click a button by its visible label, preferring the most specific match. Buttons in this
   * design often lead with an emoji tile, so a plain prefix test is not enough.
   */
  const click = async (label) => {
    const handle = await page.evaluateHandle((want) => {
      const norm = (s) => s.replace(/\s+/g, " ").trim().toUpperCase();
      const buttons = [...document.querySelectorAll("button")].filter((b) => !b.disabled);
      return (
        buttons.find((b) => norm(b.innerText) === want) ??
        buttons.find((b) => norm(b.innerText).startsWith(want)) ??
        buttons.find((b) => norm(b.innerText).includes(want))
      );
    }, label.toUpperCase());
    const el = handle.asElement();
    if (!el) throw new Error(`no enabled button labelled "${label}". Screen: ${(await screenText()).slice(0, 300)}`);
    await el.click();
    await settle();
  };

  const clickTestId = async (id, index = 0) => {
    const els = await page.$$(`[data-testid="${id}"]`);
    if (!els[index]) throw new Error(`no [data-testid="${id}"] at index ${index} (found ${els.length})`);
    await els[index].click();
    await settle();
  };

  const tokens = () =>
    page.evaluate(() => {
      const el = document.querySelector('[data-testid="tokens"]');
      return el ? Number(el.innerText.replace(/\D/g, "")) : NaN;
    });

  /** Optional visual record of each screen, for eyeballing design fidelity after a refactor. */
  let shotNo = 0;
  const shoot = async (name) => {
    if (!SHOTS) return;
    shotNo += 1;
    await page.screenshot({ path: path.join(SHOTS, `${String(shotNo).padStart(2, "0")}-${name}.png`) });
  };

  const expect = async (needle, step) => {
    const body = await screenText();
    if (!body.includes(needle.toUpperCase())) {
      throw new Error(`expected "${needle}" on screen for "${step}". Got: ${body.slice(0, 400)}`);
    }
    ok(step);
  };

  const waitForText = (re, timeout = 10000) =>
    page.waitForFunction((src) => new RegExp(src).test(document.body.innerText), { timeout }, re.source);

  /* ── cover ── */
  await page.goto(BASE, { waitUntil: "networkidle2", timeout: 45000 });
  await waitForText(/PRESS START/, 25000);
  await expect("PRESS START", "cover loaded after fetching card data");
  await shoot("cover");

  const fighters = await page.evaluate(() => Number(document.body.innerText.match(/FIGHTERS\s+(\d+)/)?.[1] ?? 0));
  if (fighters < 700) throw new Error(`cover shows ${fighters} fighters, expected the full roster`);
  ok(`cover reports ${fighters} fighters`);

  await click("PRESS START");
  await expect("CHOOSE BATTLE TYPE", "pressed start");
  await shoot("type-select");

  /* ── trivia ── */
  await click("YC COMPANY TRIVIA");
  await expect("YC TRIVIA", "opened trivia");

  const tokensBeforeTrivia = await tokens();
  if (!Number.isFinite(tokensBeforeTrivia)) throw new Error("token counter is unreadable on the trivia screen");

  await clickTestId("trivia-option");
  await waitForText(/CORRECT!|WRONG ANSWER/, 5000);
  const gotItRight = (await screenText()).includes("CORRECT!");
  const tokensAfterTrivia = await tokens();
  const expectedDelta = gotItRight ? 1 : 0;
  if (tokensAfterTrivia !== tokensBeforeTrivia + expectedDelta) {
    throw new Error(
      `trivia paid ${tokensAfterTrivia - tokensBeforeTrivia} tokens for a ${
        gotItRight ? "correct" : "wrong"
      } answer, expected ${expectedDelta}`
    );
  }
  ok(`trivia answer was ${gotItRight ? "correct" : "wrong"} and paid ${expectedDelta} token(s)`);
  await shoot("trivia");

  /* A locked question must not pay again on repeated taps. */
  await clickTestId("trivia-option", 1);
  await clickTestId("trivia-option", 2);
  if ((await tokens()) !== tokensAfterTrivia) throw new Error("re-tapping a locked answer changed the token balance");
  ok("re-tapping a locked answer pays nothing");

  await click("NEXT");
  await expect("YC TRIVIA", "advanced to the next question");
  await click("← BACK");
  await expect("CHOOSE BATTLE TYPE", "left trivia");

  /* ── claim ── */
  await click("LARP BATTLE");
  await expect("FIND", "opened the claim screen");
  await expect("FIGHTERS ON THE GUEST LIST", "claim screen reports the roster size");

  await page.type("input", "a");
  await page.waitForSelector('[data-testid="card-row"]', { timeout: 5000 });
  await shoot("claim-search");
  const claimedName = await page.evaluate(
    () => document.querySelector('[data-testid="card-row"]').innerText.split("\n")[0]
  );
  await clickTestId("card-row");

  await expect("IS THIS YOU?", `claimed ${claimedName}`);
  await expect(claimedName, "profile shows the claimed name");
  await expect("FLEX", "profile shows the flex total");

  /* The four bars must add up to the flex score printed beside them. */
  const barMath = await page.evaluate(() => {
    const body = document.body.innerText;
    const bar = (label) => Number(body.match(new RegExp(label + "\\s+(\\d+)/\\d+"))?.[1] ?? NaN);
    const parts = ["SCHOOL", "WORK", "PRESENCE", "PROJECTS"].map(bar);
    const flex = Number(body.match(/(\d+)\s*FLEX/)?.[1] ?? NaN);
    return { parts, flex, sum: parts.reduce((a, b) => a + b, 0) };
  });
  if (barMath.parts.some(Number.isNaN)) throw new Error(`could not read all four bars: ${barMath.parts}`);
  if (!Number.isFinite(barMath.flex)) throw new Error("could not read the flex total on the profile");
  if (barMath.sum !== barMath.flex) {
    throw new Error(`bars sum to ${barMath.sum} but the card shows ${barMath.flex} flex`);
  }
  ok(`profile bars ${barMath.parts.join("+")} = ${barMath.flex} flex`);
  await shoot("profile");

  /* ── battle ── */
  await click("YES,");
  await expect("PICK CHALLENGER", "opened challenger select");
  await shoot("challenger-select");
  await click("CHOOSE");
  await expect("CHALLENGERS", "opened the challenger list");
  await expect("CLOSE FIGHTS FIRST", "challenger list defaults to close matchups");
  await shoot("challenger-list");

  const listLeaksScores = await page.evaluate(() =>
    [...document.querySelectorAll('[data-testid="card-row"]')].some((r) => /#\d+/.test(r.innerText))
  );
  if (listLeaksScores) throw new Error("challenger list showed ranks/scores before the fight");
  ok("challenger list hides scores");

  await clickTestId("card-row");
  await expect("PLACE YOUR BET", "reached the face-off");
  await shoot("faceoff");

  const hidesScores = await page.evaluate(() => !/\d+\s*FLEX/.test(document.body.innerText));
  if (!hidesScores) throw new Error("the face-off leaks flex scores before the vote");
  ok("face-off hides scores until the vote");

  const tokensBeforeBattle = await tokens();
  await clickTestId("faceoff-you");
  await waitForText(/YOU WIN!|YOU LOSE/, 5000);
  await expect("WINNER", "battle resolved");
  await expect("BREAKDOWN", "result shows the stat comparison");

  const resultText = await screenText();
  const called = /CALLED IT|YOUR BET HIT/.test(resultText);
  const missed = /WRONG CALL|YOUR BET MISSED/.test(resultText);
  if (!called && !missed) throw new Error("result did not report the bet outcome");
  ok(`result reported ${called ? "a hitting" : "a missing"} bet`);

  const tokensAfterBattle = await tokens();
  const expectedPay = called ? 1 : 0;
  if (tokensAfterBattle !== tokensBeforeBattle + expectedPay) {
    throw new Error(
      `battle paid ${tokensAfterBattle - tokensBeforeBattle} tokens after a ${called ? "hit" : "miss"}, expected ${expectedPay}`
    );
  }
  ok(`battle paid ${expectedPay} token(s) for the bet`);

  /* The winner's score must be the larger of the two shown. */
  const scoreboard = await page.evaluate(() => {
    const body = document.body.innerText;
    return { winner: Number(body.match(/(\d+)\s*WINNER/)?.[1] ?? NaN), loser: Number(body.match(/(\d+)\s*LOSER/)?.[1] ?? NaN) };
  });
  if (!(scoreboard.winner >= scoreboard.loser)) {
    throw new Error(`scoreboard shows winner ${scoreboard.winner} below loser ${scoreboard.loser}`);
  }
  ok(`scoreboard reads ${scoreboard.winner} to ${scoreboard.loser}`);
  await shoot("result");

  /* ── chest ── */
  const tokensBeforeChest = await tokens();
  await click("OPEN CHEST");
  await expect("LOOT CHEST", "opened the chest screen");
  await click("OPEN —");
  await waitForText(/DROP!/, 20000);
  await expect("DROP!", "chest revealed an item");
  if ((await tokens()) !== tokensBeforeChest - 1) throw new Error("chest did not charge exactly one token");
  ok("chest charged exactly one token");
  await shoot("chest-reveal");
  await click("DONE");
  await expect("REWARDS", "returned to the rewards hub");
  await expect("ITEMS COLLECTED", "hub shows collection stats");

  /* ── slots ── */
  await click("FORTUNE SLOTS");
  await expect("JACKPOT", "opened slots");
  const tokensBeforeSpin = await tokens();
  await click("SPIN");
  await waitForText(/JACKPOT!|WIN!|NO MATCH/, 25000);
  const tokensAfterSpin = await tokens();
  if (tokensAfterSpin > tokensBeforeSpin + 100 || tokensAfterSpin < tokensBeforeSpin - 5) {
    throw new Error(`spin moved tokens from ${tokensBeforeSpin} to ${tokensAfterSpin}, which looks wrong`);
  }
  ok(`slots resolved a spin (${tokensBeforeSpin} to ${tokensAfterSpin} tokens)`);
  await shoot("slots");

  /* ── store ── */
  await click("STORE");
  await expect("INVENTORY (1)", "store lists the chest item");
  await expect(claimedName, "store header shows the claimed card");
  await shoot("store");

  if (SHOT) {
    await page.screenshot({ path: SHOT });
    ok(`screenshot written to ${SHOT}`);
  }
} finally {
  await browser.close();
}

for (const s of steps) console.log(`  ok  ${s}`);

if (problems.length) {
  console.error(`\nFLOW SMOKE FAILED - ${problems.length} browser problem(s):`);
  for (const p of [...new Set(problems)]) console.error(`  - ${p}`);
  process.exit(1);
}

console.log(`\nFLOW SMOKE OK - ${steps.length} checks, no console or network errors`);
