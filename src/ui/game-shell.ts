import type { RunState } from "../domain/schema.js";
import type { ContentRegistry } from "../domain/schema.js";
import type { BattleView } from "./battle-view.js";
import { stageUrlForRun } from "./stage-presentation.js";
import { identityForClub } from "../content/character-identities.js";

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
  private stageNodeId: string | null = null;

  constructor(root: HTMLElement, run: RunState, view: BattleView, content: ContentRegistry) {
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
    this.overlay.className = "game-shell-overlay";
    this.stage.append(this.overlay);
    this.stage.style.backgroundImage = `url("${stageUrlForRun(view.art, run)}")`;
    this.stageNodeId = run.map.currentNodeId;
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

  showBattle(run: RunState, previous: HTMLElement): void {
    const next = previous.querySelector<HTMLElement>(".game");
    const stage = next?.querySelector<HTMLElement>(".stage");
    const slot = stage?.querySelector<HTMLElement>(".ally-slot");
    const hero = slot?.querySelector<HTMLImageElement>(".hero-art");
    const input = next?.querySelector<HTMLInputElement>(".typing-input");
    const control = next?.querySelector<HTMLElement>(".control-deck");
    const header = next?.querySelector<HTMLElement>(".topbar");
    if (!next || !stage || !slot || !hero || !input || !control || !header) throw new Error("Incomplete battle render");
    const nodeId = run.map.currentNodeId;
    if (this.stageNodeId !== nodeId) {
      this.stage.style.backgroundImage = stage.style.backgroundImage;
      this.stageNodeId = nodeId;
    }
    for (const name of ["data-act", "data-stage-phase", "data-ally-count", "data-enemy-count"]) {
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
    if (slot.dataset.actorMotion) this.actor.dataset.actorMotion = slot.dataset.actorMotion;
    else delete this.actor.dataset.actorMotion;
    slot.replaceWith(this.actor);
    this.actor.replaceChildren(this.hero, ...[...slot.childNodes].filter((child) => child !== hero));
    this.overlay.remove();
    this.stage.replaceChildren(...stage.childNodes, this.overlay);
    input.replaceWith(this.input);
    this.input.removeAttribute("aria-label");
    this.input.setAttribute("aria-describedby", input.getAttribute("aria-describedby") ?? "");
    this.input.value = input.value;
    this.input.disabled = input.disabled;
    this.control.replaceChildren(...control.childNodes);
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

  showOverlay(screen: "reward" | "map", run: RunState, rendered: HTMLElement): void {
    const panel = rendered.querySelector<HTMLElement>(screen === "reward" ? ".reward-panel" : ".map-panel");
    if (!panel) throw new Error(`Missing ${screen} panel`);
    this.overlay.replaceChildren(panel);
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
    meta.textContent = `ACT ${run.act} · ${node?.floor ?? 0}F · ${screen === "reward" ? "報酬" : "経路"}`;
    this.header.append(meta);
    const hp = document.createElement("div");
    hp.className = "player-hud run-player-hud";
    hp.setAttribute("aria-label", `${this.content.clubs.find((club) => club.id === run.clubId)?.name ?? "主人公"}の状態`);
    const ratio = Math.max(0, Math.min(100, run.player.hp / run.player.maxHp * 100));
    hp.innerHTML = `<span class="player-health"><strong>♥ ${run.player.hp}<span>/${run.player.maxHp}</span></strong><span class="player-health-track" role="meter" aria-label="プレイヤーのHP" aria-valuemin="0" aria-valuemax="${run.player.maxHp}" aria-valuenow="${run.player.hp}"><span class="player-health-fill" style="width:${ratio}%"></span></span></span><span class="run-gold" aria-label="所持金 ${run.gold}">◉ ${run.gold}</span><span class="run-deck" aria-label="デッキ ${run.deck.length}枚">▣ ${run.deck.length}</span>`;
    this.header.append(hp);
  }
}
