import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import process from "node:process";

// Issue #232: an automated UI route survey. Virtual clock time is not human play time.
const [baseUrl, clubId, seedText, routePolicy = "safe", outputDirectory] = process.argv.slice(2);
if (!baseUrl || !clubId || !seedText || !outputDirectory || !["safe", "combat"].includes(routePolicy)) {
  console.error("Usage: node scripts/probe-full-run.mjs <url> <club-id> <seed> <safe|combat> <new-output-directory>");
  process.exit(2);
}
const seed = Number(seedText);
if (!Number.isSafeInteger(seed) || seed < 0) throw new RangeError("seed must be a nonnegative integer");
await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const wallStartedAt = performance.now();
const errors = [];
const observations = [];
let activeNodeId = "";
let actionCount = 0;
page.on("pageerror", (error) => errors.push(error.message));

async function saved() {
  return page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1") || "null"));
}
async function recordScreen(screen, extra = {}) {
  const session = (await saved())?.session;
  const run = session?.run;
  if (!run) throw new Error(`no saved run on ${screen}`);
  const node = run.map.nodes.find((item) => item.id === run.map.currentNodeId);
  if (!node) throw new Error(`node missing on ${screen}`);
  const background = await page.locator(".stage, .run-screen").first().evaluate((element) => getComputedStyle(element).backgroundImage).catch(() => null);
  observations.push({ screen, nodeId: node.id, act: node.act, floor: node.floor, kind: node.kind,
    hp: run.player.hp, maxHp: run.player.maxHp, background, ...extra });
  activeNodeId = node.id;
  actionCount++;
}
async function tap(locator) {
  await locator.first().focus();
  await page.keyboard.press("Enter");
}
async function typeBattle() {
  const priorities = ["heavy strike", "sweep", "proof", "verse", "reaction", "thrust", "riposte", "final cut", "beat", "chorus", "crescendo", "mural", "sketch", "strike", "jot", "sample", "distill", "observe", "finish", "poison", "leaf", "formula", "quarantine", "parry", "stance", "kata", "tempo", "sync", "rest", "frame", "outline", "defend", "counter", "draw", "boost", "delay"];
  const isArt = (await page.locator(".player-hud").innerText()).includes("美術部");
  const order = isArt ? ["frame", "defend", ...priorities.filter((item) => item !== "frame" && item !== "defend")] : priorities;
  for (let turn = 0; turn < 25; turn++) {
    for (let use = 0; use < 15; use++) {
      if (await page.locator(".reward-panel, .run-result").count()) return;
      const words = await page.locator(".card-word").allInnerTexts();
      const word = order.find((item) => words.includes(item));
      if (!word) break;
      await page.evaluate((value) => {
        for (const key of value) window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
      }, word);
      if (await page.locator(".reward-panel, .run-result").count()) return;
      if (await page.locator(".typing-hint").filter({ hasText: "攻撃対象の敵を選択" }).count()) {
        await page.locator(".enemy-slot").last().click();
      }
      if (await page.locator(".reward-panel, .run-result").count()) return;
      if ((await page.locator(".typing-buffer").innerText()).trim() === word) {
        await tap(page.locator(".card").filter({ has: page.locator(".card-word").filter({ hasText: new RegExp(`^${word}$`) }) }));
      }
      if ((await page.locator(".typing-buffer").innerText()).trim()) await page.keyboard.press("Escape");
    }
    await page.clock.runFor(11_000);
  }
  throw new Error("battle exceeded 25 turns");
}
function visitCount() { return observations.filter((item) => item.screen === "node").length; }

try {
  await page.clock.install();
  await page.goto(`${baseUrl}/?playtest=1&seed=${seed}`);
  await tap(page.getByRole("button", { name: "ランを始める" }));
  const clubNames = { "literature-demo": "文芸部", "science-demo": "科学部", "kendo-demo": "剣道部", "music-demo": "軽音部", "art-demo": "美術部" };
  if (!clubNames[clubId]) throw new RangeError(`unknown club ${clubId}`);
  await tap(page.getByRole("button", { name: new RegExp(clubNames[clubId]) }));
  const first = (await saved())?.session?.run;
  const maxFloor = Math.max(...first.map.nodes.filter((node) => node.act === 1).map((node) => node.floor));
  if (maxFloor !== 13) throw new Error(`shortened map detected: Act 1 boss floor ${maxFloor}`);

  for (let step = 0; step < 115 && !(await page.locator(".run-result").count()); step++) {
    if (await page.locator(".map-panel").count()) {
      const run = (await saved()).session.run;
      const available = page.locator(".map-node.available");
      const hp = run.player.hp;
      const rest = available.filter({ hasText: "休憩" });
      const combat = available.filter({ hasText: "戦闘" });
      const gentle = available.filter({ hasText: /宝箱|イベント|購買|休憩/ });
      const selected = hp <= 23 && await rest.count() ? rest.first()
        : routePolicy === "combat" && hp > 23 && await combat.count() ? combat.first()
        : await gentle.count() ? gentle.first() : available.first();
      await tap(selected);
      await recordScreen("node");
    } else if (await page.locator(".enemy-slot").count()) {
      const run = (await saved()).session.run;
      if (run.player.hp <= 24 && await page.locator(".potion").filter({ hasText: "bandage" }).count()) {
        await page.keyboard.press("F2");
        await page.keyboard.type("bandage");
      }
      await recordScreen("battle", { enemyIds: run.combat.enemies.map((enemy) => enemy.enemyId),
        intentIds: run.combat.enemies.map((enemy) => enemy.intentId) });
      await typeBattle();
    } else if (await page.locator(".treasure-panel").count()) {
      await recordScreen("treasure", { offers: await page.locator(".treasure-offer").allInnerTexts() });
      await tap(page.locator(".treasure-offer:not(:disabled)"));
    } else if (await page.locator(".reward-panel:not(.run-result):not(.economy-panel):not(.event-panel)").count()) {
      await recordScreen("reward", { cards: await page.locator(".reward-card").allInnerTexts() });
      await tap(page.getByRole("button", { name: "報酬を受け取らず進む" }));
    } else if (await page.locator(".economy-panel").count()) {
      await recordScreen("economy");
      if (await page.getByRole("button", { name: "購買を出る" }).count()) await tap(page.getByRole("button", { name: "購買を出る" }));
      else await tap(page.locator("[data-action=rest-heal]"));
    } else if (await page.locator(".event-panel").count()) {
      const run = (await saved()).session.run;
      const choices = page.locator(".event-choice:not(:disabled)").filter({ hasNotText: "戦う" });
      const heal = choices.filter({ hasText: /回復|手当て|深呼吸/ });
      const selected = await heal.count() ? heal.first() : choices.first();
      await recordScreen("event", { eventId: run.event?.eventId, choice: await selected.getAttribute("data-id") });
      await tap(selected);
    } else if (await page.locator(".run-result").count()) break;
    else throw new Error(`unknown screen after ${visitCount()} nodes: ${(await page.locator("body").innerText()).slice(0, 250)}`);
  }
  if (!(await page.locator(".run-result").count())) throw new Error(`step limit after ${visitCount()} nodes`);
  await recordScreen("result", { text: (await page.locator(".run-result").innerText()).slice(0, 400) });
} catch (error) {
  errors.push(error instanceof Error ? error.stack ?? error.message : String(error));
} finally {
  const savedRun = await saved().catch(() => null);
  const metrics = await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-playtest-v1") || "null")).catch(() => null);
  const outcome = {
    format: "school-rg-normal-run-ui-survey-v1", clubId, seed, routePolicy,
    mapMode: "default; shortRun omitted", virtualClock: true,
    timeMeaning: "Wall time is automation execution; playtest activeMs includes Playwright virtual clock advances. Neither is human play time or 60-minute evidence.",
    wallMs: Math.round(performance.now() - wallStartedAt), actionCount,
    finalScreen: await page.locator(".run-result").count() ? "result" : "incomplete",
    runResult: metrics?.result ?? null, errors, observations, metrics,
    finalNodeId: savedRun?.session?.run?.map?.currentNodeId ?? null,
  };
  const target = `${outputDirectory}/${clubId}-seed${seed}-${routePolicy}.json`;
  await writeFile(target, `${JSON.stringify(outcome, null, 2)}\n`, { flag: "wx" });
  console.log(JSON.stringify({ target, wallMs: outcome.wallMs, finalScreen: outcome.finalScreen,
    result: outcome.runResult, visits: metrics?.visits?.length, battles: metrics?.battles?.length, errors: errors.length }));
  await browser.close();
  if (errors.length) process.exitCode = 1;
}
