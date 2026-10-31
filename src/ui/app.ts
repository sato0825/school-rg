import { useCardEffects } from "../domain/card-effects.js";
import { dispositionForCard } from "../domain/card-keywords.js";
import { DEFAULT_GAME_CONFIG, requireSetting } from "../domain/config.js";
import { resolveEnemyIntents } from "../domain/enemy-ai.js";
import { executeEnemyIntentEffects } from "../domain/enemy-intent-effects.js";
import { buyRunShopCard, buyRunShopPotion, buyRunShopRelic, chooseRunEventChoice, chooseRunReward, chooseRunTreasure, createRunSession, enterRunNode, leaveRunShop, removeRunShopCard, settleRunCombat, useRunRest } from "../domain/run-flow.js";
import { DEFAULT_MAP_OPTIONS, type MapGenerationOptions } from "../domain/map-generation.js";
import type { RunState } from "../domain/schema.js";
import { beginEnemyPhase, beginPlayerTurn, completeEnemyPhase, pausePlayerTurn, resumePlayerTurn, selectTypedCard, selectTypedEnemyTarget, selectTypedHandTarget, submitPlayerKey, tickPlayerTurn } from "../domain/turn-state.js";
import { demoContent, demoRunContentTables, demoEnemyAi } from "../content/demo-battle.js";
import { demoRelicRules } from "../content/demo-battle.js";
import { emitRelicEvent, type RelicEventKind, type RelicEvent } from "../domain/relic-hooks.js";
import { discardPotion, selectPotionEnemy, selectPotionSlot, setPotionInputActive, submitPotionKey } from "../domain/potions.js";
import { renderBattle, type BattleView } from "./battle-view.js";
import { candidateBattleArt, demoBattleArt } from "./demo-art.js";
import { cardFxForUse } from "./card-fx.js";
import { recordCombatResult } from "../domain/combat-action-log.js";
import { MOTION_MS } from "./motion-timing.js";
import { renderClubSelect, renderCompendium, renderRunCombatLog, renderRunEvent, renderRunHistory, renderRunMap, renderRunRest, renderRunResult, renderRunReward, renderRunShop, renderRunTitle, renderRunTreasure, renderSaveRecovery } from "./run-view.js";
import { deserializeRunSession, serializeRunSession } from "../domain/save.js";
import { browserHistoryStore, browserPlaytestStore, browserProgressStore, browserSaveStore, type SaveStore } from "./save-store.js";
import { appendRunHistory, emptyRunHistory, legacyTerminalRunId, parseRunHistory, terminalRunEntry } from "../domain/run-history.js";
import { emptyProgression, parseProgression, unlockAfterVictory, unlockedLevel, MAX_ASCENSION_LEVEL } from "../domain/ascension.js";
import { finishPlaytest, finishPlaytestBattle, observePlaytest, parsePlaytestRecord, recordPlaytestBattle, resumePlaytest, startPlaytest, visitPlaytestNode, type PlaytestTracker } from "./playtest-metrics.js";
import { browserRandomUint32, newRunSeed } from "./run-seed.js";
import { createAudioFeedback } from "./audio.js";

const config = DEFAULT_GAME_CONFIG;
const disposition = (instanceId: string, combat: NonNullable<RunState["combat"]>) => dispositionForCard(combat, demoContent, config, instanceId);
/** Explicit short path for development and E2E; regular runs use the provisional full map. */
const shortMapOptions: MapGenerationOptions = { floorsPerAct: 2, lanes: 4, kindWeights: { combat: 1, elite: 0, event: 1, shop: 1, rest: 2, treasure: 2 } };

export function mountApp(root: HTMLElement, store: SaveStore = browserSaveStore(), progressStore: SaveStore = browserProgressStore(), playtestStore: SaveStore = browserPlaytestStore(), historyStore: SaveStore = browserHistoryStore()): () => void {
  const audio = createAudioFeedback();
  const params = new URLSearchParams(window.location.search);
  const mapOptions = import.meta.env.DEV && params.get("shortRun") === "1" ? shortMapOptions : DEFAULT_MAP_OPTIONS;
  const createSeed = () => newRunSeed(window.location.search, browserRandomUint32, import.meta.env.DEV);
  const clock = { nowMs: () => Math.floor(performance.now()) };
  let progression = emptyProgression();
  let progressionLoadError = false;
  try {
    const savedProgression = progressStore.read();
    if (savedProgression) progression = parseProgression(JSON.parse(savedProgression), demoContent);
  } catch { progressionLoadError = true; }
  let history = emptyRunHistory();
  let historyLoadError = false;
  let historySaveError = false;
  try {
    const savedHistory = historyStore.read();
    if (savedHistory) history = parseRunHistory(JSON.parse(savedHistory));
  } catch { historyLoadError = true; }
  const selectedAscensionLevels: Record<string, number> = {};
  let session = createRunSession(0, "literature-demo", demoContent, mapOptions);
  let frontScreen: "title" | "clubs" | "compendium" | "combat-log" | "history" | null = "title";
  let frontReturn: "title" | null = "title";
  let resumeAfterOverlay = false;
  let restoreError = false;
  try {
    const saved = store.read();
    if (saved) {
      session = deserializeRunSession(saved, demoContent, clock);
      session = { ...session, runId: session.runId ?? (session.screen === "won" || session.screen === "lost" ? legacyTerminalRunId(saved) : crypto.randomUUID()) };
      frontScreen = null;
    }
  } catch { restoreError = true; }
  let run: RunState = session.run;
  const previewArt = params.get("artPreview") === "1";
  const layoutPreview = Number(params.get("layoutPreview"));
  const playtestEnabled = params.get("playtest") === "1";
  let metrics: PlaytestTracker | null = null;
  let metricsLoadError = false;
  if (playtestEnabled && frontScreen === null && !restoreError) {
    try {
      const savedMetrics = playtestStore.read();
      const parsedMetrics = savedMetrics ? parsePlaytestRecord(JSON.parse(savedMetrics)) : null;
      metrics = parsedMetrics && parsedMetrics.runId === session.runId ? resumePlaytest(parsedMetrics, run, session.runId!, clock.nowMs(),
        session.screen !== "won" && session.screen !== "lost" && !(run.combat?.clock.paused ?? false) && document.visibilityState === "visible")
        : startPlaytest(run, session.runId!, clock.nowMs(), true);
      if (!parsedMetrics || parsedMetrics.runId !== session.runId) metrics = visitPlaytestNode(metrics, run.map.nodes.find((node) => node.id === run.map.currentNodeId)!);
    } catch { metricsLoadError = true; }
  }
  const view: BattleView = { art: previewArt ? candidateBattleArt : demoBattleArt, baseTurnMs: requireSetting(config.playerTurnMs), potionModeKey: requireSetting(config.potionModeKey), potionSlotLimit: requireSetting(config.potionSlots), message: "カード名をタイプして発動。誤入力は無視されます。", selectedDiscardId: null, selectedDebuff: null, motion: null, motionStartedAtMs: null, cardFx: null, animationNowMs: clock.nowMs(), layoutPreviewAllies: layoutPreview === 2 || layoutPreview === 3 ? layoutPreview : undefined };
  const artPreloads: HTMLImageElement[] = [];
  let preloadedClubId: string | null = null;
  const preloadClubArt = (clubId: string) => {
    if (preloadedClubId === clubId) return;
    artPreloads.length = 0;
    preloadedClubId = clubId;
    for (const url of Object.values(view.art.heroPosesByClubId?.[clubId] ?? {})) {
      const image = new Image();
      image.src = url;
      artPreloads.push(image);
    }
  };
  let enemyPending = false;
  let generation = 0;
  const setMotion = (motion: BattleView["motion"]) => { view.motion = motion; view.motionStartedAtMs = motion ? clock.nowMs() : null; };
  const fireRelic = (state: RunState, kind: RelicEventKind, detail: Omit<RelicEvent, "id" | "kind"> = {}): RunState =>
    emitRelicEvent(state, kind, demoRelicRules, demoContent, detail).run;
  const metricsActive = () => frontScreen === null && !restoreError && session.screen !== "won" && session.screen !== "lost"
    && document.visibilityState === "visible" && !(run.combat?.clock.paused ?? false);
  const observeMetrics = () => { if (metrics) metrics = observePlaytest(metrics, clock.nowMs(), metricsActive()); };
  const recordTerminal = () => {
    if (historyLoadError || (session.screen !== "won" && session.screen !== "lost")) return;
    const next = appendRunHistory(history, terminalRunEntry(session));
    const changed = next !== history;
    history = next;
    if (changed || historySaveError) {
      try { historyStore.write(JSON.stringify(history)); historySaveError = false; }
      catch { historySaveError = true; }
    }
  };
  const startCombat = () => {
    preloadClubArt(run.clubId);
    view.cardFx = null;
    if (metrics) metrics = recordPlaytestBattle(metrics, run);
    run = fireRelic(run, "combat_start");
    run = beginPlayerTurn(run, clock, config, demoContent);
    run = fireRelic(run, "turn_start");
  };
  const persist = () => {
    if (restoreError || frontScreen !== null) return;
    observeMetrics();
    try { store.write(serializeRunSession({ ...session, run }, demoContent, clock, disposition)); }
    catch { view.message = "保存できませんでした。"; }
    if (metrics) try { playtestStore.write(JSON.stringify(metrics.record)); }
    catch { metricsLoadError = true; }
  };
  const render = () => {
    const handScrollLeft = root.querySelector<HTMLElement>(".hand")?.scrollLeft ?? 0;
    const restoreCombatLogFocus = frontScreen === "combat-log" && root.querySelector('[data-action="front-back"]') === document.activeElement;
    if (restoreError) renderSaveRecovery(root, demoBattleArt);
    else if (frontScreen === "title") renderRunTitle(root, demoBattleArt, history);
    else if (frontScreen === "clubs") renderClubSelect(root, demoContent, demoBattleArt, progression, selectedAscensionLevels, progressionLoadError);
    else if (frontScreen === "compendium") renderCompendium(root, demoContent, demoBattleArt);
    else if (frontScreen === "combat-log") renderRunCombatLog(root, run, demoContent, demoBattleArt);
    else if (frontScreen === "history") renderRunHistory(root, history, demoContent, demoBattleArt, historyLoadError, historySaveError);
    else if (session.screen === "map") renderRunMap(root, session, demoBattleArt, metrics?.record ?? null, metricsLoadError);
    else if (session.screen === "reward") renderRunReward(root, session, demoContent, demoBattleArt);
    else if (session.screen === "treasure") renderRunTreasure(root, session, demoContent, demoBattleArt, config);
    else if (session.screen === "shop") renderRunShop(root, session, demoContent, demoBattleArt, view.message);
    else if (session.screen === "rest") renderRunRest(root, session, demoContent, demoBattleArt);
    else if (session.screen === "event") renderRunEvent(root, session, demoContent, demoBattleArt);
    else if (session.screen === "won" || session.screen === "lost") renderRunResult(root, session, demoBattleArt, metrics?.record ?? null, metricsLoadError, historyLoadError || historySaveError);
    else { view.animationNowMs = clock.nowMs(); renderBattle(root, run, demoContent, view); }
    const handElement = root.querySelector<HTMLElement>(".hand");
    if (handElement) handElement.scrollLeft = handScrollLeft;
    if (restoreCombatLogFocus) root.querySelector<HTMLButtonElement>('[data-action="front-back"]')?.focus();
    const header = root.querySelector(".topbar, .run-header");
    if (header) {
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "audio-toggle";
      toggle.dataset.action = "toggle-audio";
      toggle.setAttribute("aria-pressed", String(audio.enabled));
      toggle.setAttribute("aria-label", audio.enabled ? "効果音をオフにする" : "効果音をオンにする");
      toggle.textContent = audio.enabled ? "音 ON" : "音 OFF";
      header.append(toggle);
      if (metrics && frontScreen === null && session.screen !== "won" && session.screen !== "lost") {
        const exportButton = document.createElement("button");
        exportButton.type = "button";
        exportButton.className = "playtest-export";
        exportButton.dataset.action = "export-playtest";
        exportButton.textContent = "計測JSONを保存";
        header.append(exportButton);
      }
    }
    persist();
  };

  function settleIfFinished(): void {
    if (session.screen !== "combat" || (run.combat?.phase !== "WON" && run.combat?.phase !== "LOST")) return;
    audio.play(run.combat.phase === "WON" ? "win" : "lose");
    run = recordCombatResult(run);
    run = fireRelic(run, "combat_end");
    if (metrics) { observeMetrics(); metrics = finishPlaytestBattle(metrics, run, run.combat!.phase === "WON" ? "won" : "lost"); }
    session = settleRunCombat({ ...session, run }, demoContent);
    run = session.run;
    recordTerminal();
    if (metrics && (session.screen === "won" || session.screen === "lost")) metrics = finishPlaytest(metrics, session.screen, clock.nowMs());
    if (session.screen === "won" && !progressionLoadError) {
      progression = unlockAfterVictory(progression, session);
      try { progressStore.write(JSON.stringify(progression)); }
      catch { view.message = "難度の解放を保存できませんでした。"; }
    }
  }

  const useCard = (state: RunState, instanceId: string, targetEnemyInstanceId: string | null, targetHandInstanceId: string | null): RunState => {
    const cardId = state.combat!.cards.find((item) => item.instanceId === instanceId)!.cardId;
    const card = demoContent.cards.find((item) => item.id === cardId)!;
    const cardFx = cardFxForUse(card, state, targetEnemyInstanceId, view.layoutPreviewAllies ?? 1, clock.nowMs());
    const updated = useCardEffects(state, instanceId, {
      targetEnemyInstanceId,
      targetHandInstanceId,
      targetDiscardInstanceId: view.selectedDiscardId,
      targetDebuff: view.selectedDebuff as "weak" | "vulnerable" | "frail" | "poison" | null,
    }, config, demoContent);
    audio.play("card");
    view.message = `${card.input.text} を発動`;
    view.cardFx = cardFx;
    setMotion("hero");
    view.selectedDiscardId = null;
    view.selectedDebuff = null;
    const currentGeneration = generation;
    const startedAtMs = view.motionStartedAtMs;
    window.setTimeout(() => { if (generation === currentGeneration && view.motion === "hero" && view.motionStartedAtMs === startedAtMs) { view.cardFx = null; setMotion(null); render(); } }, MOTION_MS.hero);
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
    audio.play("enemy");
    setMotion("enemy");
    view.message = "敵が予告した行動を実行します。";
    render();
    const currentGeneration = generation;
    window.setTimeout(() => {
      if (currentGeneration !== generation) return;
      try {
        let receivedHit = false;
        run = completeEnemyPhase(run, (state) => resolveEnemyIntents(state, demoEnemyAi, demoContent,
          (live, enemyInstanceId, intent) => executeEnemyIntentEffects(live, enemyInstanceId, intent, demoEnemyAi, demoContent, config,
            (hitState, hpLost) => {
              if (hpLost > 0) receivedHit = true;
              return fireRelic(hitState, "hit_taken", { hpLost });
            })), config);
        enemyPending = false;
        if (receivedHit) audio.play("hit");
        setMotion(receivedHit ? "hit" : null);
        if (run.combat?.phase === "PLAYER_START") {
          run = beginPlayerTurn(run, clock, config, demoContent);
          run = fireRelic(run, "turn_start");
          view.message = "次のターン。カード名をタイプしてください。";
        } else settleIfFinished();
        render();
        if (receivedHit) window.setTimeout(() => { if (generation === currentGeneration && view.motion === "hit") { setMotion(null); render(); } }, MOTION_MS.hit);
      } catch (error) { handleError(error); }
    }, MOTION_MS.enemyPhase);
  }

  function restart(): void {
    generation++;
    enemyPending = false;
    setMotion(null);
    view.cardFx = null;
    view.selectedDiscardId = null;
    view.selectedDebuff = null;
    session = createRunSession(0, "literature-demo", demoContent, mapOptions);
    run = session.run;
    metrics = null;
    frontScreen = "title";
    frontReturn = "title";
    resumeAfterOverlay = false;
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
      if (action === "toggle-audio") { audio.toggle(); render(); return; }
      if (action === "new-run" || action === "restart") { restart(); return; }
      if (action === "open-clubs" && frontScreen === "title") { frontScreen = "clubs"; render(); return; }
      if (action === "open-history" && (frontScreen === "title" || (frontScreen === null && (session.screen === "won" || session.screen === "lost")))) {
        frontReturn = frontScreen === "title" ? "title" : null;
        frontScreen = "history";
        render();
        return;
      }
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
        session = { ...createRunSession(createSeed(), id, demoContent, mapOptions, undefined, level), runId: crypto.randomUUID() };
        run = session.run;
        frontScreen = null;
        metricsLoadError = false;
        if (playtestEnabled) metrics = visitPlaytestNode(startPlaytest(run, session.runId!, clock.nowMs()), run.map.nodes.find((node) => node.id === run.map.currentNodeId)!);
        render();
        return;
      }
      if (action === "open-compendium" && (frontScreen === "title" || (frontScreen === null && (session.screen === "map" || (session.screen === "combat" && run.combat?.phase === "PLAYER_INPUT"))))) {
        frontReturn = frontScreen === "title" ? "title" : null;
        resumeAfterOverlay = session.screen === "combat" && run.combat?.phase === "PLAYER_INPUT" && !run.combat.clock.paused;
        if (resumeAfterOverlay) run = pausePlayerTurn(run, clock, disposition);
        frontScreen = "compendium";
        render();
        return;
      }
      const liveLog = session.screen === "combat" && run.combat?.phase === "PLAYER_INPUT";
      const completedLog = (session.screen === "reward" || session.screen === "won" || session.screen === "lost") && Boolean(run.lastCombatLog);
      if (action === "open-combat-log" && frontScreen === null && (liveLog || completedLog)) {
        frontReturn = null;
        resumeAfterOverlay = liveLog && !run.combat!.clock.paused;
        if (resumeAfterOverlay) run = pausePlayerTurn(run, clock, disposition);
        if (liveLog && run.combat?.phase !== "PLAYER_INPUT") { resumeAfterOverlay = false; render(); enemyPhase(); return; }
        frontScreen = "combat-log";
        render();
        root.querySelector<HTMLButtonElement>("[data-action=front-back]")?.focus();
        return;
      }
      if (action === "front-back" && frontScreen) {
        frontScreen = frontScreen === "clubs" ? "title" : frontReturn;
        if (resumeAfterOverlay && run.combat?.phase === "PLAYER_INPUT" && run.combat.clock.paused) run = resumePlayerTurn(run, clock);
        resumeAfterOverlay = false;
        render();
        enemyPhase();
        return;
      }
      if (frontScreen !== null || restoreError) return;
      if (restoreError) return;
      if (action === "export-playtest" && metrics) {
        persist();
        const blob = new Blob([JSON.stringify(metrics.record, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `school-rg-playtest-${metrics.record.runId}.json`;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 0);
        return;
      }
      if (session.screen === "won" || session.screen === "lost") {
        return;
      }
      if (session.screen === "map" && action === "enter-node") {
        observeMetrics();
        session = enterRunNode(session, id, demoContent, demoEnemyAi, demoRunContentTables);
        run = session.run;
        if (metrics) metrics = visitPlaytestNode(metrics, run.map.nodes.find((node) => node.id === id)!);
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
        const targetCardInstanceId = button.closest(".event-target-choice")?.querySelector<HTMLSelectElement>("select[data-event-target]")?.value;
        session = chooseRunEventChoice(session, id, demoContent, demoEnemyAi, config, targetCardInstanceId);
        run = session.run;
        for (let index = relicCount; index < run.relicIds.length; index++) run = fireRelic(run, "acquired", { relicId: run.relicIds[index] });
        if (session.screen === "combat") startCombat();
        view.message = "カード名をタイプして発動。誤入力は無視されます。";
        render();
        return;
      }
      if (session.screen === "shop") {
        if (action === "buy-offer") { session = buyRunShopCard(session, id); view.message = "カードを購入しました。"; }
        else if (action === "buy-relic") {
          session = buyRunShopRelic(session, id, demoContent);
          run = fireRelic(session.run, "acquired", { relicId: session.run.shop!.relicOffers.find((offer) => offer.offerId === id)!.contentId });
          session = { ...session, run };
          view.message = "レリックを購入しました。";
        }
        else if (action === "buy-potion") { session = buyRunShopPotion(session, id, demoContent, config); view.message = "ポーションを購入しました。"; }
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
    observeMetrics();
    if (session.screen === "combat" && document.hidden && run.combat?.phase === "PLAYER_INPUT" && !run.combat.clock.paused) {
      run = pausePlayerTurn(run, clock, disposition);
      view.message = "画面を離れたため一時停止しました。";
      render();
    }
    persist();
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
  if (session.screen === "won" || session.screen === "lost") recordTerminal();
  if (metrics && session.screen === "combat" && run.combat) metrics = recordPlaytestBattle(metrics, run, true);
  if (session.screen === "combat" && run.combat?.phase === "PLAYER_START") startCombat();
  if (session.screen === "combat") preloadClubArt(run.clubId);
  render();
  if (session.screen === "combat") enemyPhase();
  return () => {
    audio.dispose();
    artPreloads.length = 0;
    window.clearInterval(timer);
    window.clearInterval(saveTimer);
    root.removeEventListener("click", onClick);
    window.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", onPageHide);
    generation++;
  };
}
