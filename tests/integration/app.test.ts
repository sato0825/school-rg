// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mountApp } from "../../src/ui/app.js";
import { demoContent } from "../../src/content/demo-battle.js";
import { createRunSession } from "../../src/domain/run-flow.js";
import { serializeRunSession } from "../../src/domain/save.js";

describe("run and typing combat HUD", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    window.history.replaceState(null, "", "/?seed=42");
  });
  afterEach(() => window.history.replaceState(null, "", "/"));

  it("shows combat state and ignores a wrong key", () => {
    const root = document.querySelector<HTMLElement>("#app");
    if (!root) throw new Error("Missing test root");
    const unmount = mountApp(root);
    expect(root.querySelector("h1")?.textContent).toBe("学園タイピングローグライク");
    expect(root.textContent).toContain("放課後を、打ち抜く。");
    root.querySelector<HTMLButtonElement>("[data-action=open-clubs]")?.click();
    root.querySelector<HTMLButtonElement>("[data-action=choose-club]")?.click();
    expect(root.textContent).toContain("次の行き先を選ぶ");
    root.querySelector<HTMLButtonElement>(".map-node.available[aria-label*='戦闘']")?.click();
    expect(root.querySelectorAll(".card")).toHaveLength(5);
    expect(root.textContent).toContain("飛び散る答案");
    expect(root.textContent).toContain("山札 5");
    expect(root.textContent).toContain("捨て札 0");
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", bubbles: true }));
    expect(root.querySelector(".typing-visual")?.textContent).toBe("");
    expect(root.querySelector<HTMLInputElement>(".typing-input")?.hasAttribute("placeholder")).toBe(false);
    unmount();
  });

  it("keeps the sound choice across rendering and mounting", () => {
    window.localStorage.removeItem("school-rg-audio-v1");
    const root = document.querySelector<HTMLElement>("#app")!;
    const unmount = mountApp(root);
    expect(root.querySelector("[data-action=toggle-audio]")?.getAttribute("aria-pressed")).toBe("true");
    root.querySelector<HTMLButtonElement>("[data-action=toggle-audio]")!.click();
    expect(root.querySelector("[data-action=toggle-audio]")?.getAttribute("aria-pressed")).toBe("false");
    expect(window.localStorage.getItem("school-rg-audio-v1")).toBe("off");
    unmount();
    const unmountAgain = mountApp(root);
    expect(root.querySelector("[data-action=toggle-audio]")?.getAttribute("aria-pressed")).toBe("false");
    unmountAgain();
    window.localStorage.removeItem("school-rg-audio-v1");
  });

  it("keeps the low stimulus choice across rendering and mounting", () => {
    window.localStorage.removeItem("school-rg-low-stimulus-v1");
    const root = document.querySelector<HTMLElement>("#app")!;
    const unmount = mountApp(root);
    root.querySelector<HTMLButtonElement>("[data-action=open-clubs]")?.click();
    root.querySelector<HTMLButtonElement>("[data-action=choose-club]")?.click();
    root.querySelector<HTMLButtonElement>(".map-node.available[aria-label*='戦闘']")?.click();
    root.querySelector<HTMLButtonElement>("[data-action=toggle-stimulus]")!.click();
    expect(root.querySelector(".game")?.getAttribute("data-effects")).toBe("quiet");
    expect(root.querySelector("[data-action=toggle-stimulus]")?.getAttribute("aria-pressed")).toBe("true");
    unmount();
    const unmountAgain = mountApp(root);
    expect(root.querySelector(".game")?.getAttribute("data-effects")).toBe("quiet");
    unmountAgain();
    window.localStorage.removeItem("school-rg-low-stimulus-v1");
  });

  it("keeps focus and the accessible value through typing, cancellation, and potion mode", () => {
    const root = document.querySelector<HTMLElement>("#app")!;
    const unmount = mountApp(root, { read: () => null, write: () => undefined });
    root.querySelector<HTMLButtonElement>("[data-action=open-clubs]")?.click();
    root.querySelector<HTMLButtonElement>("[data-action=choose-club]")?.click();
    root.querySelector<HTMLButtonElement>(".map-node.available[aria-label*='戦闘']")?.click();
    const firstWord = root.querySelector(".card-word")!.textContent!.trim();
    const original = root.querySelector<HTMLInputElement>(".typing-input")!;
    original.focus();
    original.dispatchEvent(new KeyboardEvent("keydown", { key: "z", bubbles: true, cancelable: true }));
    expect(root.querySelector<HTMLInputElement>(".typing-input")!.value).toBe("");
    root.querySelector<HTMLInputElement>(".typing-input")!.dispatchEvent(new KeyboardEvent("keydown", { key: firstWord[0], bubbles: true, cancelable: true }));
    expect(root.querySelector<HTMLInputElement>(".typing-input")!.value).toBe(firstWord[0]);
    expect(document.activeElement).toBe(root.querySelector(".typing-input"));
    root.querySelector<HTMLInputElement>(".typing-input")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    expect(root.querySelector<HTMLInputElement>(".typing-input")!.value).toBe("");
    root.querySelector<HTMLInputElement>(".typing-input")!.dispatchEvent(new KeyboardEvent("keydown", { key: "F2", bubbles: true, cancelable: true }));
    expect(root.querySelector(".potion-mode")?.getAttribute("aria-pressed")).toBe("true");
    expect(root.querySelector<HTMLInputElement>(".typing-input")!.labels?.[0]?.textContent).toBe("ポーション名をタイプ");
    expect(document.activeElement).toBe(root.querySelector(".typing-input"));
    unmount();
  });

  it("reports a failed history write without changing the saved run", () => {
    const root = document.querySelector<HTMLElement>("#app")!;
    const start = createRunSession(42, "literature-demo", demoContent);
    const boss = start.run.map.nodes.find((node) => node.act === 3 && node.kind === "boss")!;
    const terminal = { ...start, runId: "saved-run", screen: "won" as const,
      run: { ...start.run, act: 3 as const, map: { ...start.run.map, currentNodeId: boss.id } },
      completedNodeIds: [...start.completedNodeIds, boss.id] };
    const saved = serializeRunSession(terminal, demoContent, { nowMs: () => 0 }, () => "discard");
    let writes = 0;
    const unmount = mountApp(root, { read: () => saved, write: () => undefined },
      { read: () => null, write: () => undefined }, { read: () => null, write: () => undefined },
      { read: () => null, write: () => { writes++; throw new Error("quota exceeded"); } });
    expect(writes).toBe(1);
    expect(root.querySelector(".history-error")?.textContent).toContain("保存または読込できません");
    root.querySelector<HTMLButtonElement>("[data-action=open-history]")!.click();
    expect(root.querySelector(".history-error")?.textContent).toContain("再読込後に残らない");
    expect(root.textContent).toContain("完走 1");
    unmount();
  });

  it("does not duplicate a terminal legacy save when the active save cannot be rewritten", () => {
    const root = document.querySelector<HTMLElement>("#app")!;
    const start = createRunSession(42, "literature-demo", demoContent);
    const boss = start.run.map.nodes.find((node) => node.act === 3 && node.kind === "boss")!;
    const saved = serializeRunSession({ ...start, screen: "won", run: { ...start.run, act: 3,
      map: { ...start.run.map, currentNodeId: boss.id } }, completedNodeIds: [...start.completedNodeIds, boss.id] },
      demoContent, { nowMs: () => 0 }, () => "discard");
    let history: string | null = null;
    const saveStore = { read: () => saved, write: () => undefined };
    const historyStore = { read: () => history, write: (value: string) => { history = value; } };
    const emptyStore = { read: () => null, write: () => undefined };
    mountApp(root, saveStore, emptyStore, emptyStore, historyStore)();
    const first = history;
    expect(JSON.parse(first!).entries).toHaveLength(1);
    mountApp(root, saveStore, emptyStore, emptyStore, historyStore)();
    expect(history).toBe(first);
  });
});
