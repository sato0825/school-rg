import type { RunState } from "../domain/schema.js";
import type { ContentRegistry } from "../domain/schema.js";
import type { BattleView } from "./battle-view.js";
import { stageSelectionForRun, type StageArt } from "./stage-presentation.js";
import { createLossNote, defeatCandidateByClubId, lossHeader, type LossNoteOptions } from "./loss-view.js";
import type { RunSession } from "../domain/run-flow.js";
import { identityForClub } from "../content/character-identities.js";
import { createVictoryNote, victoryCandidateByClubId, victoryHeader, type VictoryNoteOptions } from "./victory-view.js";
import { DEFAULT_GAME_CONFIG, requireSetting, type GameConfig } from "../domain/config.js";
import { potionInventoryMarkup, relicDetailMarkup, relicInventoryMarkup } from "./item-art.js";

/** The stage and actor belong to the run, rather than to an individual screen. */
export class GameShell {
  private readonly main: HTMLElement;
  private readonly stage: HTMLElement;
  private readonly actor: HTMLElement;
  private readonly hero: HTMLImageElement;
  private readonly input: HTMLInputElement;
  private readonly control: HTMLElement;
  private readonly header: HTMLElement;
  private readonly overlay: HTMLElement;
  private readonly content: ContentRegistry;
  private readonly view: BattleView;
  private readonly art: StageArt;
  private readonly config: GameConfig;
  private stageNodeId: string | null = null;

  constructor(root: HTMLElement, run: RunState, view: BattleView, content: ContentRegistry, config: GameConfig = DEFAULT_GAME_CONFIG) {
    const initial = document.createElement("div");
    initial.innerHTML = `<main class="game game-shell" aria-label="学園タイピングローグライク"><header class="topbar"></header><section class="stage" aria-label="ゲームの舞台"><div class="stage-vignette"></div><div class="ally-group"><div class="ally-slot"><img class="hero-art" alt="主人公" /><div class="hero-shadow"></div><span class="hero-nameplate"></span></div></div></section><section class="control-deck"><input id="battle-typing-input" class="typing-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="カード名を入力" /></section></main>`;
    const main = initial.querySelector<HTMLElement>(".game");
    const stage = main?.querySelector<HTMLElement>(".stage");
    const actor = stage?.querySelector<HTMLElement>(".ally-slot");
    const hero = actor?.querySelector<HTMLImageElement>(".hero-art");
    const input = main?.querySelector<HTMLInputElement>(".typing-input");
    const control = main?.querySelector<HTMLElement>(".control-deck");
    const header = main?.querySelector<HTMLElement>(".topbar");
    if (!main || !stage || !actor || !hero || !input || !control || !header) throw new Error("Incomplete battle GameShell");
    this.main = main;
    this.stage = stage;
    this.actor = actor;
    this.hero = hero;
    this.input = input;
    this.control = control;
    this.header = header;
    this.overlay = document.createElement("div");
    this.content = content;

    this.view = view;
    this.art = view.art;
    this.config = config;

    this.main.dataset.effects = view.lowStimulus ? "quiet" : "standard";

    this.overlay.className = "game-shell-overlay";
    this.stage.append(this.overlay);
    this.syncStage(run);
    this.actor.style.setProperty("--slot-x", "22%");
    this.hero.src = view.art.heroPosesByClubId?.[run.clubId]?.idle ?? view.art.heroUrlByClubId?.[run.clubId] ?? view.art.heroUrl;
    const clubName = content.clubs.find((club) => club.id === run.clubId)?.name ?? "主人公";
    const characterName = identityForClub(run.clubId)?.fullName ?? clubName;
    this.hero.alt = `${characterName}、${clubName}`;
    this.actor.querySelector(".hero-nameplate")!.textContent = `${characterName} · ${clubName} · 仮名`;
    root.replaceChildren(main);
  }

  get element(): HTMLElement { return this.main; }
  get typingInput(): HTMLInputElement { return this.input; }

  private syncStage(run: RunState): void {
    if (this.stageNodeId === run.map.currentNodeId) return;
    const selection = stageSelectionForRun(this.art, run);
    this.stage.style.backgroundImage = `url("${selection.stageUrl}")`;
    this.stage.dataset.act = String(run.map.nodes.find((node) => node.id === run.map.currentNodeId)?.act ?? run.act);
    this.stage.dataset.stagePlace = selection.placeId ?? "";
    this.stage.dataset.stageArt = selection.artId ?? "";
    this.stage.dataset.stageBand = selection.band === null ? "" : String(selection.band);
    this.stageNodeId = run.map.currentNodeId;
  }

  showBattle(run: RunState, previous: HTMLElement): void {
    const next = previous.querySelector<HTMLElement>(".game");
    const stage = next?.querySelector<HTMLElement>(".stage");
    const slot = stage?.querySelector<HTMLElement>(".ally-slot");
    const hero = slot?.querySelector<HTMLImageElement>(".hero-art");
    const nextRig = slot?.querySelector<HTMLElement>(".hero-rig");
    const currentRig = this.actor.querySelector<HTMLElement>(".hero-rig");
    const input = next?.querySelector<HTMLInputElement>(".typing-input");
    const control = next?.querySelector<HTMLElement>(".control-deck");
    const header = next?.querySelector<HTMLElement>(".topbar");
    if (!next || !stage || !slot || !hero || !input || !control || !header) throw new Error("Incomplete battle render");
    this.syncStage(run);
    for (const name of ["data-stage-phase", "data-ally-count", "data-enemy-count"]) {
      const value = stage.getAttribute(name);
      if (value === null) this.stage.removeAttribute(name);
      else this.stage.setAttribute(name, value);
    }
    this.main.dataset.club = next.dataset.club;
    this.main.dataset.effects = next.dataset.effects;
    this.header.classList.remove("run-header");
    this.header.replaceChildren(...header.childNodes);
    this.hero.className = hero.className;
    this.hero.src = hero.src;
    this.hero.alt = hero.alt;
    this.hero.style.cssText = hero.style.cssText;
    this.actor.style.cssText = slot.style.cssText;
    this.actor.dataset.playerBlock = slot.dataset.playerBlock ?? "0";
    this.actor.dataset.blockEvent = slot.dataset.blockEvent ?? "none";
    if (slot.dataset.actorMotion) this.actor.dataset.actorMotion = slot.dataset.actorMotion;
    else delete this.actor.dataset.actorMotion;
    if (slot.dataset.actorRig) this.actor.dataset.actorRig = slot.dataset.actorRig;
    else delete this.actor.dataset.actorRig;
    const currentAllyGroup = this.actor.parentElement;
    const nextAllyGroup = slot.parentElement;
    if (!currentAllyGroup?.classList.contains("ally-group") || !nextAllyGroup?.classList.contains("ally-group")) throw new Error("Missing persistent ally group");
    if (nextRig && currentRig && nextRig.dataset.rigId === currentRig.dataset.rigId) {
      // Keep decoded images and animation phase across timer/input redraws.
      currentRig.style.cssText = nextRig.style.cssText;
      const currentNameplate = this.actor.querySelector<HTMLElement>(".hero-nameplate");
      const nextNameplate = slot.querySelector<HTMLElement>(".hero-nameplate");
      if (currentNameplate && nextNameplate) currentNameplate.innerHTML = nextNameplate.innerHTML;
    } else {
      delete this.actor.dataset.rigReady;
      this.actor.replaceChildren(this.hero, ...[...slot.childNodes].filter((child) => child !== hero));
    }
    const rig = this.actor.querySelector<HTMLElement>(".hero-rig");
    if (rig && this.actor.dataset.rigReady !== "true") {
      const images = [...rig.querySelectorAll<HTMLImageElement>(".rig-part")];
      if (images.every((image) => typeof image.decode === "function")) {
        void Promise.all(images.map((image) => image.decode())).then(() => {
          if (this.actor.contains(rig)) this.actor.dataset.rigReady = "true";
        }).catch(() => { /* Keep the complete standing portrait if any layer fails. */ });
      }
    }
    // Keep the actor attached to the live stage. Detaching it restarts all limb animations.
    for (const child of [...currentAllyGroup.children]) if (child !== this.actor) child.remove();
    for (const child of [...nextAllyGroup.children]) if (child !== slot) currentAllyGroup.append(child);
    for (const child of [...this.stage.childNodes]) if (child !== currentAllyGroup && child !== this.overlay) child.remove();
    let beforeAllyGroup = true;
    for (const child of [...stage.childNodes]) {
      if (child === nextAllyGroup) { beforeAllyGroup = false; continue; }
      this.stage.insertBefore(child, beforeAllyGroup ? currentAllyGroup : this.overlay);
    }
    const currentTypingRow = this.control.querySelector<HTMLElement>(".typing-row");
    const nextTypingRow = control.querySelector<HTMLElement>(".typing-row");
    if (currentTypingRow && nextTypingRow) {
      // Preserve the focused input while the clock, hand, and typing feedback redraw.
      for (const selector of [".typing-caption", ".typing-visual", ".typing-input-help", ".ime-notice", ".typing-hint"]) {
        const current = currentTypingRow.querySelector<HTMLElement>(selector);
        const incoming = nextTypingRow.querySelector<HTMLElement>(selector);
        if (current && incoming) current.innerHTML = incoming.innerHTML;
      }
      for (const child of [...this.control.childNodes]) if (child !== currentTypingRow) child.remove();
      let beforeTypingRow = true;
      for (const child of [...control.childNodes]) {
        if (child === nextTypingRow) { beforeTypingRow = false; continue; }
        this.control.insertBefore(child, beforeTypingRow ? currentTypingRow : null);
      }
    } else {
      input.replaceWith(this.input);
      this.control.replaceChildren(...control.childNodes);
    }
    this.input.removeAttribute("aria-label");
    this.input.setAttribute("aria-describedby", input.getAttribute("aria-describedby") ?? "");
    this.input.value = input.value;
    this.input.disabled = input.disabled;
    this.main.querySelector("#battle-help")?.remove();
    this.main.querySelector(".result-backdrop")?.remove();
    this.main.querySelector(".battle-map-overlay")?.remove();
    for (const selector of ["#battle-help", ".result-backdrop"]) {
      const extra = next.querySelector(selector);
      if (extra) this.main.append(extra);
    }
    this.main.dataset.screen = "combat";
    this.control.inert = false;
    this.control.removeAttribute("aria-hidden");
    this.overlay.replaceChildren();
  }

  showOverlay(screen: "reward" | "map" | "treasure" | "shop" | "rest" | "event", run: RunState, rendered: HTMLElement): void {
    this.syncStage(run);
    const panel = rendered.querySelector<HTMLElement>(screen === "reward" ? ".reward-panel" : screen === "map" ? ".map-panel" : ".location-scene");
    if (!panel) throw new Error(`Missing ${screen} panel`);
    this.overlay.replaceChildren(panel);
    if (this.view.selectedRelicId && run.relicIds.includes(this.view.selectedRelicId)) {
      this.overlay.insertAdjacentHTML("beforeend", relicDetailMarkup(this.view.selectedRelicId, this.content));
    }
    this.main.dataset.screen = screen;
    this.input.disabled = true;
    this.control.inert = true;
    this.control.setAttribute("aria-hidden", "true");
    for (const child of [...this.stage.children]) {
      if (child !== this.overlay && !child.classList.contains("stage-vignette") && !child.classList.contains("ally-group")) child.remove();
    }
    this.header.replaceChildren();
    this.header.classList.add("run-header");
    const meta = document.createElement("div");
    meta.className = "run-meta";
    const node = run.map.nodes.find((item) => item.id === run.map.currentNodeId);
    const screenNames = { reward: "報酬", map: "経路", treasure: "宝箱", shop: "購買", rest: "休憩", event: "イベント" };
    meta.textContent = `ACT ${run.act} · ${node?.floor ?? 0}F · ${screenNames[screen]}`;
    this.header.append(meta);
    const hp = document.createElement("div");
    hp.className = "player-hud run-player-hud";
    hp.setAttribute("aria-label", `${this.content.clubs.find((club) => club.id === run.clubId)?.name ?? "主人公"}の状態`);
    const ratio = Math.max(0, Math.min(100, run.player.hp / run.player.maxHp * 100));
    hp.innerHTML = `<span class="player-health"><strong>♥ ${run.player.hp}<span>/${run.player.maxHp}</span></strong><span class="player-health-track" role="meter" aria-label="プレイヤーのHP" aria-valuemin="0" aria-valuemax="${run.player.maxHp}" aria-valuenow="${run.player.hp}"><span class="player-health-fill" style="width:${ratio}%"></span></span></span><span class="run-gold" aria-label="所持金 ${run.gold}">◉ ${run.gold}</span><span class="run-deck" aria-label="デッキ ${run.deck.length}枚">▣ ${run.deck.length}</span>${relicInventoryMarkup(run.relicIds, this.content, this.view.selectedRelicId)}<span class="run-potions" aria-label="ポーション ${run.potionIds.length}/${requireSetting(this.config.potionSlots)}枠">${potionInventoryMarkup(run.potionIds, this.content)}</span>`;
    this.header.append(hp);
  }

  showVictory(session: RunSession, lowStimulus: boolean, options: VictoryNoteOptions, arrivedFromBattle: boolean): void {
    const firstArrival = this.main.dataset.screen !== "won";
    const { run } = session;
    this.main.dataset.screen = "won";
    this.main.dataset.terminalTransition = firstArrival && arrivedFromBattle ? "live" : "still";
    this.main.dataset.club = run.clubId;
    this.main.dataset.effects = lowStimulus ? "quiet" : "standard";
    this.stage.dataset.act = String(run.act);
    this.input.disabled = true;
    this.input.value = "";
    this.control.inert = true;
    this.control.setAttribute("aria-hidden", "true");
    this.releaseBattleRig();
    this.hero.className = "hero-art victory-pose";
    this.hero.style.removeProperty("animation-delay");
    this.hero.src = victoryCandidateByClubId[run.clubId] ?? this.hero.src;
    const club = this.content.clubs.find((item) => item.id === run.clubId)?.name ?? "部活動";
    const name = identityForClub(run.clubId)?.fullName;
    this.hero.alt = `${name ? `${name}、` : ""}${club}の生徒の達成姿勢（制作候補）`;
    this.actor.querySelector(".hero-nameplate")!.textContent = `${name ? `${name} · ` : ""}${club}${name ? " · 仮名" : ""}`;
    for (const transient of this.stage.querySelectorAll(".card-fx-layer, .result-fx-layer")) transient.remove();
    this.main.querySelector("#battle-help")?.remove();
    this.main.querySelector(".result-backdrop")?.remove();
    this.header.classList.add("run-header");
    this.header.replaceChildren(victoryHeader(run, this.content));
    const note = createVictoryNote(session, options);
    this.overlay.replaceChildren(note);
    if (firstArrival) note.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
  }

  showLoss(session: RunSession, lowStimulus: boolean, options: LossNoteOptions): void {
    const wasLoss = this.main.dataset.screen === "lost";
    const { run } = session;
    this.main.dataset.screen = "lost";
    this.main.dataset.club = run.clubId;
    this.main.dataset.effects = lowStimulus ? "quiet" : "standard";
    this.stage.dataset.act = String(run.act);
    this.input.disabled = true;
    this.input.value = "";
    this.control.inert = true;
    this.control.setAttribute("aria-hidden", "true");
    this.releaseBattleRig();
    this.hero.className = "hero-art loss-pose";
    this.hero.style.removeProperty("animation-delay");
    this.hero.src = defeatCandidateByClubId[run.clubId] ?? this.hero.src;
    const club = this.content.clubs.find((item) => item.id === run.clubId)?.name ?? "部活動";
    const name = identityForClub(run.clubId)?.fullName;
    this.hero.alt = `${name ? `${name}、` : ""}${club}の生徒の敗北姿勢（制作候補）`;
    this.actor.querySelector(".hero-nameplate")!.textContent = `${name ? `${name} · ` : ""}${club}${name ? " · 仮名" : ""}`;
    for (const transient of this.stage.querySelectorAll(".card-fx-layer, .result-fx-layer")) transient.remove();
    this.main.querySelector("#battle-help")?.remove();
    this.main.querySelector(".result-backdrop")?.remove();
    this.header.classList.add("run-header");
    this.header.replaceChildren(lossHeader(run, this.content));
    const note = createLossNote(session, this.content, options);
    this.overlay.replaceChildren(note);
    if (!wasLoss) note.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
  }

  private releaseBattleRig(): void {
    delete this.actor.dataset.playerBlock;
    delete this.actor.dataset.blockEvent;
    delete this.actor.dataset.actorMotion;
    delete this.actor.dataset.actorRig;
    delete this.actor.dataset.rigReady;
    this.actor.querySelector(".hero-rig")?.remove();
    this.actor.querySelector(".hero-motion-frame")?.remove();
  }
}
