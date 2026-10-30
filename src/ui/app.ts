import { useCardEffects } from "../domain/card-effects.js";
import { DEFAULT_GAME_CONFIG, requireSetting } from "../domain/config.js";
import { resolveEnemyIntents } from "../domain/enemy-ai.js";
import { executeEnemyIntentEffects } from "../domain/enemy-intent-effects.js";
import type { RunState } from "../domain/schema.js";
import { beginEnemyPhase, beginPlayerTurn, completeEnemyPhase, pausePlayerTurn, resumePlayerTurn, selectTypedCard, selectTypedEnemyTarget, selectTypedHandTarget, submitPlayerKey, tickPlayerTurn } from "../domain/turn-state.js";
import { demoContent, demoEnemyAi, createDemoBattle } from "../content/demo-battle.js";
import { renderBattle, type BattleView } from "./battle-view.js";
import { demoBattleArt } from "./demo-art.js";

const config = DEFAULT_GAME_CONFIG;
const disposition = () => "discard" as const;

export function mountApp(root: HTMLElement): () => void {
  let run: RunState = createDemoBattle();
  const view: BattleView = { art: demoBattleArt, baseTurnMs: requireSetting(config.playerTurnMs), message: "カード名をタイプして発動。誤入力は無視されます。", selectedDiscardId: null, selectedDebuff: null, motion: null };
  let enemyPending = false;
  let generation = 0;
  const clock = { nowMs: () => Math.floor(performance.now()) };
  const render = () => renderBattle(root, run, demoContent, view);

  const useCard = (state: RunState, instanceId: string, targetEnemyInstanceId: string | null, targetHandInstanceId: string | null): RunState => {
    const cardId = state.combat!.cards.find((item) => item.instanceId === instanceId)!.cardId;
    const card = demoContent.cards.find((item) => item.id === cardId)!;
    const updated = useCardEffects(state, instanceId, {
      targetEnemyInstanceId,
      targetHandInstanceId,
      targetDiscardInstanceId: view.selectedDiscardId,
      targetDebuff: view.selectedDebuff as "weak" | "vulnerable" | "frail" | "poison" | null,
    }, config, demoContent);
    view.message = `${card.input.text} を発動`;
    view.motion = "hero";
    view.selectedDiscardId = null;
    view.selectedDebuff = null;
    const currentGeneration = generation;
    window.setTimeout(() => { if (generation === currentGeneration) { view.motion = null; render(); } }, 380);
    return updated;
  };

  function handleError(error: unknown): void {
    view.message = error instanceof Error ? error.message : "操作を確認してください。";
    render();
  }

  function enemyPhase(): void {
    if (run.combat?.phase !== "PLAYER_END" || enemyPending) return;
    run = beginEnemyPhase(run, config);
    if (run.combat?.phase === "WON" || run.combat?.phase === "LOST") { render(); return; }
    enemyPending = true;
    view.motion = "enemy";
    view.message = "敵が予告した行動を実行します。";
    render();
    const currentGeneration = generation;
    window.setTimeout(() => {
      if (currentGeneration !== generation) return;
      try {
        run = completeEnemyPhase(run, (state) => resolveEnemyIntents(state, demoEnemyAi, demoContent,
          (live, enemyInstanceId, intent) => executeEnemyIntentEffects(live, enemyInstanceId, intent, demoEnemyAi, demoContent, config)), config);
        enemyPending = false;
        view.motion = null;
        if (run.combat?.phase === "PLAYER_START") {
          run = beginPlayerTurn(run, clock, config, demoContent);
          view.message = "次のターン。カード名をタイプしてください。";
        } else view.message = run.combat?.phase === "WON" ? "勝利しました。" : "敗北しました。";
        render();
      } catch (error) { handleError(error); }
    }, 650);
  }

  function restart(): void {
    generation++;
    enemyPending = false;
    view.motion = null;
    view.selectedDiscardId = null;
    view.selectedDebuff = null;
    run = beginPlayerTurn(createDemoBattle(), clock, config, demoContent);
    view.message = "カード名をタイプして発動。誤入力は無視されます。";
    render();
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.metaKey || event.ctrlKey || event.altKey || run.combat?.phase !== "PLAYER_INPUT" || run.combat.clock.paused) return;
    if (event.key.length === 1 || event.key === "Enter" || event.key === "Escape") event.preventDefault();
    try {
      run = submitPlayerKey(run, { key: event.key, repeat: event.repeat, isComposing: event.isComposing }, clock, config, demoContent, useCard, disposition);
      render();
      enemyPhase();
    } catch (error) { handleError(error); }
  }

  function onClick(event: MouseEvent): void {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>("button[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    const id = button.dataset.id ?? "";
    try {
      if (action === "restart") { restart(); return; }
      if (action === "pause" && run.combat?.phase === "PLAYER_INPUT") {
        run = run.combat.clock.paused ? resumePlayerTurn(run, clock) : pausePlayerTurn(run, clock, disposition);
        view.message = run.combat?.clock.paused ? "一時停止中です。" : "入力を再開しました。";
      } else if (run.combat?.clock.paused) {
        return;
      } else if (run.combat?.phase === "PLAYER_INPUT" && action === "enemy") {
        run = selectTypedEnemyTarget(run, id, clock, config, demoContent, useCard, disposition);
      } else if (run.combat?.phase === "PLAYER_INPUT" && action === "card") {
        const selectedId = run.combat.typing.selectedCardInstanceId;
        const selectedCardId = run.combat.cards.find((item) => item.instanceId === selectedId)?.cardId;
        const selectedCard = demoContent.cards.find((item) => item.id === selectedCardId);
        if (selectedId && selectedId !== id && selectedCard?.target === "hand") {
          run = selectTypedHandTarget(run, id, clock, config, demoContent, useCard, disposition);
        } else if (run.combat.typing.buffer) {
          run = selectTypedCard(run, id, clock, config, demoContent, useCard, disposition);
        } else view.message = "カード名を入力すると候補を選べます。";
      } else if (action === "discard") {
        view.selectedDiscardId = id;
        view.message = "回収する捨て札を選びました。";
      } else if (action === "debuff") {
        view.selectedDebuff = id;
        view.message = "解除する状態を選びました。";
      }
      render();
      enemyPhase();
    } catch (error) { handleError(error); }
  }

  function onVisibility(): void {
    if (document.hidden && run.combat?.phase === "PLAYER_INPUT" && !run.combat.clock.paused) {
      run = pausePlayerTurn(run, clock, disposition);
      view.message = "画面を離れたため一時停止しました。";
      render();
    }
  }

  function refreshTime(): void {
    const remainingMs = run.combat!.clock.remainingMs;
    const time = root.querySelector<HTMLElement>("[data-role=time]");
    const fill = root.querySelector<HTMLElement>("[data-role=time-fill]");
    if (time) {
      const seconds = (remainingMs / 1_000).toFixed(1);
      time.innerHTML = `${seconds}<small> sec</small>`;
      time.setAttribute("aria-label", `残り時間 ${seconds}秒`);
    }
    if (fill) fill.style.width = `${Math.max(0, Math.min(100, remainingMs / view.baseTurnMs * 100))}%`;
  }

  root.addEventListener("click", onClick);
  window.addEventListener("keydown", onKeyDown);
  document.addEventListener("visibilitychange", onVisibility);
  const timer = window.setInterval(() => {
    if (run.combat?.phase !== "PLAYER_INPUT" || run.combat.clock.paused) return;
    try {
      run = tickPlayerTurn(run, clock, disposition);
      if (run.combat?.phase === "PLAYER_INPUT") refreshTime();
      else { render(); enemyPhase(); }
    } catch (error) { handleError(error); }
  }, 80);
  run = beginPlayerTurn(run, clock, config, demoContent);
  render();
  return () => {
    window.clearInterval(timer);
    root.removeEventListener("click", onClick);
    window.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("visibilitychange", onVisibility);
    generation++;
  };
}
