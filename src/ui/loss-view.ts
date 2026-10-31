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
  heading.textContent = "今日はここまで";
  heading.setAttribute("aria-label", "敗北");
  heading.tabIndex = -1;
  const eyebrow = document.createElement("span");
  eyebrow.className = "loss-note-eyebrow";
  eyebrow.textContent = "✦　敗北 · 活動記録";
  const lastDamage = run.lastCombatLog?.entries.filter((entry) => entry.playerHpDelta < 0).at(-1);
  const damage = document.createElement("p");
  damage.className = "loss-note-damage";
  if (lastDamage) {
    const enemyId = run.lastCombatLog?.enemies.find((enemy) => enemy.instanceId === lastDamage.actorEnemyInstanceId)?.enemyId;
    const source = content.enemies.find((enemy) => enemy.id === enemyId)?.name;
    const amount = Math.abs(lastDamage.playerHpDelta);
    damage.setAttribute("aria-label", `${source ? `${source}の行動で` : "最後の行動で"}HP ${amount}減少`);
    damage.textContent = `♥ −${amount}${source ? ` · ${source}` : ""}`;
  } else damage.textContent = `♥ ${run.player.hp}/${run.player.maxHp}`;
  const actions = document.createElement("div");
  actions.className = "loss-note-actions";
  for (const [label, visible, action] of [["新しいランを始める", "もう一度", "new-run"], ["ラン履歴を見る", "記録を見る", "open-history"]] as const) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.action = action;
    button.setAttribute("aria-label", label);
    button.textContent = visible;
    actions.append(button);
  }
  note.append(eyebrow, heading, damage, actions);
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
    warning.setAttribute("role", "status");
    warning.textContent = "計測データを読めません。既存データを保持しています。";
    note.append(warning);
  }
  if (options.historyError) {
    const warning = document.createElement("p");
    warning.setAttribute("role", "status");
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
  const place = document.createElement("span");
  place.className = "loss-header-place";
  place.textContent = `${club} · ACT ${run.act} · ${floor}F`;
  const health = document.createElement("span");
  health.className = "loss-header-health";
  health.setAttribute("aria-label", `HP ${run.player.hp}/${run.player.maxHp}`);
  health.innerHTML = `<span aria-hidden="true">♥</span> <strong>${run.player.hp}</strong><small>/${run.player.maxHp}</small><i aria-hidden="true"></i>`;
  header.append(place, health);
  return header;
}
