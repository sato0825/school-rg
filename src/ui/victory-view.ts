import type { ContentRegistry, RunState } from "../domain/schema.js";
import type { RunSession } from "../domain/run-flow.js";
import { presentationForClub } from "./club-presentation.js";

/** Existing action poses are temporary victory art. The mapping is display-only. */
export const victoryCandidateByClubId: Readonly<Record<string, string>> = {
  "literature-demo": presentationForClub("literature-demo").activate,
  "science-demo": presentationForClub("science-demo").activate,
  "kendo-demo": presentationForClub("kendo-demo").activate,
  "music-demo": presentationForClub("music-demo").activate,
  "art-demo": presentationForClub("art-demo").activate,
};

export type VictoryNoteOptions = {
  playtestActiveMs?: number;
  playtestVisits?: number;
  playtestBattles?: number;
  playtestPartial?: boolean;
  playtestError?: boolean;
  historyError?: boolean;
};

export function createVictoryNote(session: RunSession, options: VictoryNoteOptions = {}): HTMLElement {
  const note = document.createElement("section");
  note.className = "victory-note run-result";
  note.setAttribute("role", "region");
  note.setAttribute("aria-label", "ランの結果");
  const eyebrow = document.createElement("span");
  eyebrow.className = "victory-note-eyebrow";
  eyebrow.textContent = "✦　活動記録";
  const heading = document.createElement("h2");
  heading.textContent = "全Actクリア";
  heading.tabIndex = -1;
  const subheading = document.createElement("p");
  subheading.className = "victory-note-subtitle";
  subheading.textContent = "放課後の旅を終えました";
  const acts = document.createElement("div");
  acts.className = "victory-act-marks";
  acts.setAttribute("role", "img");
  acts.setAttribute("aria-label", "Act 1、Act 2、Act 3を完走");
  for (let act = 1; act <= 3; act++) {
    const mark = document.createElement("span");
    mark.textContent = String(act);
    mark.setAttribute("aria-hidden", "true");
    acts.append(mark);
  }
  const facts = document.createElement("div");
  facts.className = "victory-note-facts";
  const hp = document.createElement("span");
  hp.textContent = `♥ ${session.run.player.hp}/${session.run.player.maxHp}`;
  hp.setAttribute("aria-label", `残りHP ${session.run.player.hp}/${session.run.player.maxHp}`);
  const difficulty = document.createElement("span");
  difficulty.textContent = `難度 ${session.run.ascensionLevel}`;
  facts.append(hp, difficulty);
  const actions = document.createElement("div");
  actions.className = "victory-note-actions";
  for (const [label, visible, action] of [["新しいランを始める", "次のランへ", "new-run"], ["ラン履歴を見る", "記録を見る", "open-history"]] as const) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.action = action;
    button.setAttribute("aria-label", label);
    button.textContent = visible;
    actions.append(button);
  }
  note.append(eyebrow, heading, subheading, acts, facts, actions);
  if (options.playtestActiveMs !== undefined) {
    const metrics = document.createElement("div");
    metrics.className = "victory-note-metrics";
    const minutes = Math.floor(options.playtestActiveMs / 60_000);
    const seconds = Math.floor(options.playtestActiveMs % 60_000 / 1_000);
    metrics.textContent = `実操作 ${minutes}:${String(seconds).padStart(2, "0")} · 訪問 ${options.playtestVisits ?? 0}地点 · 戦闘 ${options.playtestBattles ?? 0}回${options.playtestPartial ? " · 途中から計測" : ""}`;
    const exportButton = document.createElement("button");
    exportButton.type = "button";
    exportButton.dataset.action = "export-playtest";
    exportButton.textContent = "計測JSONを保存";
    metrics.append(exportButton);
    note.append(metrics);
  } else if (options.playtestError) {
    const warning = document.createElement("p");
    warning.setAttribute("role", "status");
    warning.textContent = "計測データを読めません。既存データを保持しています。";
    note.append(warning);
  }
  if (options.historyError) {
    const warning = document.createElement("p");
    warning.className = "history-error";
    warning.setAttribute("role", "status");
    warning.textContent = "ラン履歴を保存または読込できません。既存データを保持しています。";
    note.append(warning);
  }
  return note;
}

export function victoryHeader(run: RunState, content: ContentRegistry): HTMLElement {
  const header = document.createElement("div");
  header.className = "victory-header-facts";
  const club = content.clubs.find((item) => item.id === run.clubId)?.name ?? "部活動";
  const floor = run.map.nodes.find((item) => item.id === run.map.currentNodeId)?.floor ?? 0;
  const place = document.createElement("span");
  place.className = "victory-header-place";
  place.textContent = `${club} · ACT ${run.act} · ${floor}F · 全Act完走`;
  const health = document.createElement("span");
  health.className = "victory-header-health";
  health.setAttribute("aria-label", `残りHP ${run.player.hp}/${run.player.maxHp}`);
  health.textContent = `♥ ${run.player.hp}/${run.player.maxHp}`;
  header.append(place, health);
  return header;
}
