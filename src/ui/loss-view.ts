import type { ContentRegistry, RunState } from "../domain/schema.js";
import type { RunSession } from "../domain/run-flow.js";

/** Candidate-only art registry. Replacing a pose never changes run rules or save data. */
export const defeatCandidateByClubId: Readonly<Record<string, string>> = {
  "literature-demo": new URL("../../docs/art/candidates/literature-defeat-candidate-v1.png", import.meta.url).href,
  "science-demo": new URL("../../docs/art/candidates/serious-student-defeat-candidate-v1.png", import.meta.url).href,
  "kendo-demo": new URL("../../docs/art/candidates/kendo-defeat-candidate-v1.png", import.meta.url).href,
  "music-demo": new URL("../../docs/art/candidates/music-defeat-candidate-v1.png", import.meta.url).href,
  "art-demo": new URL("../../docs/art/candidates/art-defeat-candidate-v1.png", import.meta.url).href,
};

export type LossNoteOptions = {
  playtestActiveMs?: number;
  playtestVisits?: number;
  playtestBattles?: number;
  playtestPartial?: boolean;
  playtestError?: boolean;
  historyError?: boolean;
};

/** A compact result inside the existing stage, with only facts held in the run. */
export function createLossNote(session: RunSession, content: ContentRegistry, options: LossNoteOptions = {}): HTMLElement {
  const { run } = session;
  const note = document.createElement("section");
  note.className = "loss-note run-result";
  note.setAttribute("role", "region");
  note.setAttribute("aria-label", "ランの結果");
  const heading = document.createElement("h2");
  heading.textContent = "敗北";
  heading.tabIndex = -1;
  const club = content.clubs.find((item) => item.id === run.clubId)?.name ?? "部活動";
  const floor = run.map.nodes.find((item) => item.id === run.map.currentNodeId)?.floor ?? 0;
  const facts = document.createElement("p");
  facts.className = "loss-note-facts";
  facts.textContent = `${club} · ACT ${run.act} · ${floor}F`;
  const hp = document.createElement("p");
  hp.className = "loss-note-hp";
  hp.setAttribute("aria-label", `HP ${run.player.hp}/${run.player.maxHp}`);
  hp.innerHTML = `<span aria-hidden="true">♥</span> <strong>${run.player.hp}</strong><small>/${run.player.maxHp}</small>`;
  const actions = document.createElement("div");
  actions.className = "loss-note-actions";
  for (const [label, action] of [["新しいランを始める", "new-run"], ["ラン履歴を見る", "open-history"]]) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.action = action;
    button.textContent = label;
    actions.append(button);
  }
  note.append(heading, facts, hp, actions);
  if (options.playtestActiveMs !== undefined) {
    const metrics = document.createElement("div");
    metrics.className = "loss-note-metrics";
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
    warning.role = "status";
    warning.textContent = "計測データを読めません。既存データを保持しています。";
    note.append(warning);
  }
  if (options.historyError) {
    const warning = document.createElement("p");
    warning.role = "status";
    warning.textContent = "ラン履歴を保存または読込できません。既存データを保持しています。";
    note.append(warning);
  }
  return note;
}

export function lossHeader(run: RunState, content: ContentRegistry): HTMLElement {
  const header = document.createElement("div");
  header.className = "loss-header-facts";
  const club = content.clubs.find((item) => item.id === run.clubId)?.name ?? "部活動";
  const floor = run.map.nodes.find((item) => item.id === run.map.currentNodeId)?.floor ?? 0;
  header.textContent = `${club} · ACT ${run.act} · ${floor}F · HP ${run.player.hp}/${run.player.maxHp}`;
  return header;
}
