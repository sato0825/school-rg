import { useCardEffects } from "../domain/card-effects.js";
import { dispositionForCard } from "../domain/card-keywords.js";
import { DEFAULT_GAME_CONFIG, requireSetting } from "../domain/config.js";
import { resolveEnemyIntents } from "../domain/enemy-ai.js";
import { executeEnemyIntentEffects } from "../domain/enemy-intent-effects.js";
import { buyRunShopCard, chooseRunEventChoice, chooseRunReward, chooseRunTreasure, createRunSession, enterRunNode, leaveRunShop, removeRunShopCard, settleRunCombat, useRunRest } from "../domain/run-flow.js";
import type { MapGenerationOptions } from "../domain/map-generation.js";
import type { RunState } from "../domain/schema.js";
import { beginEnemyPhase, beginPlayerTurn, completeEnemyPhase, pausePlayerTurn, resumePlayerTurn, selectTypedCard, selectTypedEnemyTarget, selectTypedHandTarget, submitPlayerKey, tickPlayerTurn } from "../domain/turn-state.js";
import { demoContent, demoEncounterTable, demoEnemyAi } from "../content/demo-battle.js";
import { demoRelicRules } from "../content/demo-battle.js";
import { emitRelicEvent, type RelicEventKind, type RelicEvent } from "../domain/relic-hooks.js";
import { discardPotion, selectPotionEnemy, selectPotionSlot, setPotionInputActive, submitPotionKey } from "../domain/potions.js";
import { renderBattle, type BattleView } from "./battle-view.js";
import { demoBattleArt } from "./demo-art.js";
import { renderClubSelect, renderCompendium, renderRunEvent, renderRunMap, renderRunRest, renderRunResult, renderRunReward, renderRunShop, renderRunTitle, renderRunTreasure, renderSaveRecovery } from "./run-view.js";
import { deserializeRunSession, serializeRunSession } from "../domain/save.js";
import { browserProgressStore, browserSaveStore, type SaveStore } from "./save-store.js";
import { emptyProgression, parseProgression, unlockAfterVictory, unlockedLevel, MAX_ASCENSION_LEVEL } from "../domain/ascension.js";

const config = DEFAULT_GAME_CONFIG;
const disposition = (instanceId: string, combat: NonNullable<RunState["combat"]>) => dispositionForCard(combat, demoContent, config, instanceId);
/** The visible run is a compact provisional Act with all implemented node kinds. */
const demoMapOptions: MapGenerationOptions = { floorsPerAct: 2, lanes: 4, kindWeights: { combat: 1, elite: 0, event: 1, shop: 1, rest: 2, treasure: 2 } };

export function mountApp(root: HTMLElement, store: SaveStore = browserSaveStore(), progressStore: SaveStore = browserProgressStore()): () => void {
  const clock = { nowMs: () => Math.floor(performance.now()) };
  let progression = emptyProgression();
  let progressionLoadError = false;
  try {
    const savedProgression = progressStore.read();
    if (savedProgression) progression = parseProgression(JSON.parse(savedProgression), demoContent);
  } catch { progressionLoadError = true; }
  const selectedAscensionLevels: Record<string, number> = {};
  let session = createRunSession(42, "literature-demo", demoContent, demoMapOptions);
  let frontScreen: "title" | "clubs" | "compendium" | null = "title";
  let frontReturn: "title" | null = "title";
  let restoreError = false;
  try {
    const saved = store.read();
    if (saved) { session = deserializeRunSession(saved, demoContent, clock); frontScreen = null; }
  } catch { restoreError = true; }
  let run: RunState = session.run;
  const view: BattleView = { art: demoBattleArt, baseTurnMs: requireSetting(config.playerTurnMs), potionModeKey: requireSetting(config.potionModeKey), potionSlotLimit: requireSetting(config.potionSlots), message: "カード名をタイプして発動。誤入力は無視されます。", selectedDiscardId: null, selectedDebuff: null, motion: null };
  let enemyPending = false;
  let generation = 0;
  const fireRelic = (state: RunState, kind: RelicEventKind, detail: Omit<RelicEvent, "id" | "kind"> = {}): RunState =>
    emitRelicEvent(state, kind, demoRelicRules, demoContent, detail).run;
  const startCombat = () => {
    run = fireRelic(run, "combat_start");
    run = beginPlayerTurn(run, clock, config, demoContent);
    run = fireRelic(run, "turn_start");
  };
  const persist = () => {
    if (restoreError || frontScreen !== null) return;
    try { store.write(serializeRunSession({ ...session, run }, demoContent, clock, disposition)); }
    catch { view.message = "保存できませんでした。"; }
  };
  const render = () => {
    if (restoreError) renderSaveRecovery(root, demoBattleArt);
    else if (frontScreen === "title") renderRunTitle(root, demoBattleArt);
    else if (frontScreen === "clubs") renderClubSelect(root, demoContent, demoBattleArt, progression, selectedAscensionLevels, progressionLoadError);
    else if (frontScreen === "compendium") renderCompendium(root, demoContent, demoBattleArt);
    else if (session.screen === "map") renderRunMap(root, session, demoBattleArt);
    else if (session.screen === "reward") renderRunReward(root, session, demoContent, demoBattleArt);
    else if (session.screen === "treasure") renderRunTreasure(root, session, demoContent, demoBattleArt, config);
    else if (session.screen === "shop") renderRunShop(root, session, demoContent, demoBattleArt, view.message);
    else if (session.screen === "rest") renderRunRest(root, session, demoContent, demoBattleArt);
    else if (session.screen === "event") renderRunEvent(root, session, demoContent, demoBattleArt);
    else if (session.screen === "won" || session.screen === "lost") renderRunResult(root, session, demoBattleArt);
    else renderBattle(root, run, demoContent, view);
    persist();
  };

  function settleIfFinished(): void {
    if (session.screen !== "combat" || (run.combat?.phase !== "WON" && run.combat?.phase !== "LOST")) return;
    run = fireRelic(run, "combat_end");
    session = settleRunCombat({ ...session, run }, demoContent);
    run = session.run;
    if (session.screen === "won" && !progressionLoadError) {
      progression = unlockAfterVictory(progression, session);
      try { progressStore.write(JSON.stringify(progression)); }
      catch { view.message = "難度の解放を保存できませんでした。"; }
    }
  }

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
    return fireRelic(updated, "card_used", { cardInstanceId: instanceId });
  };

  function handleError(error: unknown): void {
    const message = error instanceof Error ? error.message : "操作を確認してください。";
    view.message = message === "insufficient gold" ? "所持金が足りません。" : message;
    render();
  }

  function enemyPhase(): void {
    if (enemyPending || (run.combat?.phase !== "PLAYER_END" && run.combat?.phase !== "ENEMY_PHASE")) return;
    if (run.combat.phase === "PLAYER_END") {
      run = beginEnemyPhase(run, config);
      run = fireRelic(run, "turn_end");
    }
    if (run.combat?.phase === "WON" || run.combat?.phase === "LOST") { settleIfFinished(); render(); return; }
    enemyPending = true;
    view.motion = "enemy";
    view.message = "敵が予告した行動を実行します。";
    render();
    const currentGeneration = generation;
    window.setTimeout(() => {
      if (currentGeneration !== generation) return;
      try {
        run = completeEnemyPhase(run, (state) => resolveEnemyIntents(state, demoEnemyAi, demoContent,
          (live, enemyInstanceId, intent) => executeEnemyIntentEffects(live, enemyInstanceId, intent, demoEnemyAi, demoContent, config,
            (hitState, hpLost) => fireRelic(hitState, "hit_taken", { hpLost }))), config);
        enemyPending = false;
        view.motion = null;
        if (run.combat?.phase === "PLAYER_START") {
          run = beginPlayerTurn(run, clock, config, demoContent);
          run = fireRelic(run, "turn_start");
          view.message = "次のターン。カード名をタイプしてください。";
        } else settleIfFinished();
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
    session = createRunSession(42, "literature-demo", demoContent, demoMapOptions);
    run = session.run;
    frontScreen = "title";
    frontReturn = "title";
    restoreError = false;
    restoreError = false;
    view.message = "カード名をタイプして発動。誤入力は無視されます。";
    render();
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (session.screen !== "combat" || event.metaKey || event.ctrlKey || event.altKey || run.combat?.phase !== "PLAYER_INPUT" || run.combat.clock.paused) return;
    if (event.target instanceof HTMLButtonElement && (event.key === "Enter" || event.key === " ")) return;
    if (event.target instanceof HTMLButtonElement && event.key.length === 1) event.target.blur();
    if (event.key.length === 1 || event.key === "Enter" || event.key === "Escape" || event.key === requireSetting(config.potionModeKey)) event.preventDefault();
    try {
      if (event.key === requireSetting(config.potionModeKey)) run = setPotionInputActive(run, !run.combat.potionControl?.active, clock, demoContent, disposition);
      else if (run.combat.potionControl?.active) run = submitPotionKey(run, { key: event.key, repeat: event.repeat, isComposing: event.isComposing }, clock, config, demoContent, disposition);
      else run = submitPlayerKey(run, { key: event.key, repeat: event.repeat, isComposing: event.isComposing }, clock, config, demoContent, useCard, disposition);
      settleIfFinished();
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
      if (action === "new-run" || action === "restart") { restart(); return; }
      if (action === "open-clubs" && frontScreen === "title") { frontScreen = "clubs"; render(); return; }
      if (action === "ascension-level" && frontScreen === "clubs") {
        const [clubId, rawLevel] = id.split(":");
        const level = Number(rawLevel);
        if (!clubId || !demoContent.clubs.some((club) => club.id === clubId) || !Number.isSafeInteger(level) || level < 0 || level > Math.min(MAX_ASCENSION_LEVEL, unlockedLevel(progression, clubId))) return;
        selectedAscensionLevels[clubId] = level;
        render();
        return;
      }
      if (action === "choose-club" && frontScreen === "clubs") {
        const level = Math.min(selectedAscensionLevels[id] ?? 0, unlockedLevel(progression, id));
        session = createRunSession(42, id, demoContent, demoMapOptions, undefined, level);
        run = session.run;
        frontScreen = null;
        render();
        return;
      }
      if (action === "open-compendium" && (frontScreen === "title" || (frontScreen === null && session.screen === "map"))) {
        frontReturn = frontScreen === "title" ? "title" : null;
        frontScreen = "compendium";
        render();
        return;
      }
      if (action === "front-back" && frontScreen) { frontScreen = frontScreen === "clubs" ? "title" : frontReturn; render(); return; }
      if (frontScreen !== null || restoreError) return;
      if (restoreError) return;
      if (session.screen === "map" && action === "enter-node") {
        session = enterRunNode(session, id, demoContent, demoEnemyAi, demoEncounterTable);
        run = session.run;
        if (session.screen === "combat") startCombat();
        view.message = session.screen === "shop" ? "購入するカードを選んでください。" : "カード名をタイプして発動。誤入力は無視されます。";
        render();
        return;
      }
      if (session.screen === "reward" && (action === "reward-card" || action === "skip-reward")) {
        session = chooseRunReward(session, action === "skip-reward" ? null : id);
        run = session.run;
        render();
        return;
      }
      if (session.screen === "treasure" && (action === "treasure-offer" || action === "skip-treasure")) {
        const relicCount = run.relicIds.length;
        session = chooseRunTreasure(session, action === "skip-treasure" ? null : id, demoContent, config);
        run = session.run;
        for (let index = relicCount; index < run.relicIds.length; index++) run = fireRelic(run, "acquired", { relicId: run.relicIds[index] });
        render();
        return;
      }
      if (session.screen === "event" && action === "event-choice") {
        const relicCount = run.relicIds.length;
        session = chooseRunEventChoice(session, id, demoContent, demoEnemyAi, config);
        run = session.run;
        for (let index = relicCount; index < run.relicIds.length; index++) run = fireRelic(run, "acquired", { relicId: run.relicIds[index] });
        if (session.screen === "combat") startCombat();
        view.message = "カード名をタイプして発動。誤入力は無視されます。";
        render();
        return;
      }
      if (session.screen === "shop") {
        if (action === "buy-offer") { session = buyRunShopCard(session, id); view.message = "カードを購入しました。"; }
        else if (action === "remove-shop-card") { session = removeRunShopCard(session, id); view.message = "カードを削除しました。"; }
        else if (action === "leave-shop") session = leaveRunShop(session);
        run = session.run;
        render();
        return;
      }
      if (session.screen === "rest" && (action === "rest-heal" || action === "rest-upgrade")) {
        session = useRunRest(session, action === "rest-heal" ? { kind: "heal" } : { kind: "upgrade", cardInstanceId: id });
        run = session.run;
        render();
        return;
      }
      if (session.screen !== "combat") return;
      if (action === "potion-mode" && run.combat?.phase === "PLAYER_INPUT") {
        run = setPotionInputActive(run, !run.combat.potionControl?.active, clock, demoContent, disposition);
      } else if (action === "discard-potion" && run.combat?.phase === "PLAYER_INPUT") {
        run = tickPlayerTurn(run, clock, disposition);
        if (run.combat?.phase === "PLAYER_INPUT") run = discardPotion(run, Number(id));
      } else if (action === "potion" && run.combat?.phase === "PLAYER_INPUT") {
        run = run.combat.potionControl?.active && run.combat.potionControl.typing.buffer
          ? selectPotionSlot(run, id, clock, config, demoContent, disposition)
          : setPotionInputActive(run, true, clock, demoContent, disposition);
      } else if (action === "pause" && run.combat?.phase === "PLAYER_INPUT") {
        run = run.combat.clock.paused ? resumePlayerTurn(run, clock) : pausePlayerTurn(run, clock, disposition);
        view.message = run.combat?.clock.paused ? "一時停止中です。" : "入力を再開しました。";
      } else if (run.combat?.clock.paused) {
        return;
      } else if (run.combat?.phase === "PLAYER_INPUT" && action === "enemy") {
        run = run.combat.potionControl?.active
          ? selectPotionEnemy(run, id, clock, config, demoContent, disposition)
          : selectTypedEnemyTarget(run, id, clock, config, demoContent, useCard, disposition);
      } else if (run.combat?.phase === "PLAYER_INPUT" && action === "card") {
        if (run.combat.potionControl?.active) return;
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
      settleIfFinished();
      render();
      enemyPhase();
    } catch (error) { handleError(error); }
  }

  function onVisibility(): void {
    if (session.screen === "combat" && document.hidden && run.combat?.phase === "PLAYER_INPUT" && !run.combat.clock.paused) {
      run = pausePlayerTurn(run, clock, disposition);
      view.message = "画面を離れたため一時停止しました。";
      render();
    }
  }

  function onPageHide(): void { persist(); }

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
  window.addEventListener("pagehide", onPageHide);
  const timer = window.setInterval(() => {
    if (session.screen !== "combat" || run.combat?.phase !== "PLAYER_INPUT" || run.combat.clock.paused) return;
    try {
      run = tickPlayerTurn(run, clock, disposition);
      if (run.combat?.phase === "PLAYER_INPUT") refreshTime();
      else { render(); enemyPhase(); }
    } catch (error) { handleError(error); }
  }, 80);
  const saveTimer = window.setInterval(persist, 1_000);
  if (session.screen === "combat" && run.combat?.phase === "PLAYER_START") startCombat();
  render();
  if (session.screen === "combat") enemyPhase();
  return () => {
    window.clearInterval(timer);
    window.clearInterval(saveTimer);
    root.removeEventListener("click", onClick);
    window.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", onPageHide);
    generation++;
  };
}
