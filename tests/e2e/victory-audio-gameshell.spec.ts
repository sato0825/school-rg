import { expect, test } from "@playwright/test";
import { demoContent, demoEnemyAi } from "../../src/content/demo-battle.js";
import { createRunSession, enterRunNode } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";
import type { MapNode } from "../../src/domain/schema.js";
import { MOTION_MS } from "../../src/ui/motion-timing.js";

const soundCases = [
  { label: "live", quiet: false, mute: false, width: 1440, firstWinAt: 0.18 },
  { label: "quiet", quiet: true, mute: false, width: 1024, firstWinAt: 0 },
  { label: "muted", quiet: false, mute: true, width: 1024, firstWinAt: null },
] as const;

for (const { label, quiet, mute, width, firstWinAt } of soundCases) {
  test(`${label} final victory sound follows the pose and never replays on restore`, async ({ page }) => {
    await page.clock.install();
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 768 });
    const base = createRunSession(42, "literature-demo", demoContent);
    const start: MapNode = { id: "audio-final-start", act: 3, floor: 0, kind: "start", nextIds: ["audio-final-boss"] };
    const boss: MapNode = { id: "audio-final-boss", act: 3, floor: 1, kind: "boss", nextIds: [] };
    const entered = enterRunNode({ ...base, run: { ...base.run, map: { nodes: [start, boss], currentNodeId: start.id } }, completedNodeIds: [start.id] },
      boss.id, demoContent, demoEnemyAi, { combat: ["paper-scrap"], elite: ["paper-scrap"], boss: ["paper-scrap"] });
    const combat = entered.run.combat!;
    const strike = combat.cards.find((card) => card.cardId === "BASE-001")!;
    const prepared = { ...entered, run: { ...entered.run, combat: {
      ...combat,
      drawPile: [...combat.drawPile.filter((id) => id !== strike.instanceId), strike.instanceId],
      enemies: combat.enemies.map((enemy) => ({ ...enemy, hp: 1, block: 0 })),
    } } };
    const saved = serializeRunSession(prepared, demoContent, { nowMs: () => 0 }, () => "discard");
    await page.addInitScript(({ value, quietMode, muted }) => {
      if (!localStorage.getItem("school-rg-run-v1")) localStorage.setItem("school-rg-run-v1", value);
      localStorage.setItem("school-rg-low-stimulus-v1", quietMode ? "1" : "0");
      localStorage.setItem("school-rg-audio-v1", muted ? "off" : "on");
      Object.defineProperty(window, "AudioContext", { configurable: true, value: class {
        state = "running";
        currentTime = 0;
        destination = {};
        sampleRate = 44100;
        createOscillator() {
          let first = true;
          return { type: "sine", frequency: {
            setValueAtTime(hz: number, at: number) {
              if (!first) return;
              first = false;
              const events = JSON.parse(sessionStorage.getItem("audio-victory-events") ?? "[]") as { hz: number; at: number }[];
              events.push({ hz, at });
              sessionStorage.setItem("audio-victory-events", JSON.stringify(events));
            },
            exponentialRampToValueAtTime() {},
          }, connect() {}, start() {}, stop() {} };
        }
        createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
        createBuffer(_channels: number, frames: number) { return { getChannelData: () => new Float32Array(frames) }; }
        createBufferSource() { return { buffer: null, connect() {}, start() {}, stop() {} }; }
        createBiquadFilter() { return { type: "lowpass", frequency: { value: 0 }, connect() {} }; }
        resume() { return Promise.resolve(); }
        close() { return Promise.resolve(); }
      } });
    }, { value: saved, quietMode: quiet, muted: mute });
    await page.goto("/");
    await expect(page.locator('.game-shell[data-screen="combat"]')).toBeVisible();
    await page.keyboard.type("strike");
    await page.clock.runFor(MOTION_MS.hero);
    await expect(page.locator('.game-shell[data-screen="won"]')).toHaveAttribute("data-terminal-transition", "live");
    await expect(page.locator('.game-shell[data-effects="quiet"]')).toHaveCount(quiet ? 1 : 0);
    const events = await page.evaluate(() => JSON.parse(sessionStorage.getItem("audio-victory-events") ?? "[]") as { hz: number; at: number }[]);
    const winStarts = events.filter((event) => event.hz === 1046);
    if (firstWinAt === null) expect(events).toEqual([]);
    else {
      expect(winStarts).toHaveLength(1);
      expect(events.some((event) => event.hz === 620)).toBe(true);
      expect(winStarts[0]!.at).toBeCloseTo(firstWinAt + 0.16, 3);
    }
    await page.reload();
    await expect(page.locator('.game-shell[data-screen="won"]')).toHaveAttribute("data-terminal-transition", "still");
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem("audio-victory-events") ?? "[]"))).toEqual(events);
  });
}
