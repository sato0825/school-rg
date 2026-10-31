import type { RunState } from "../domain/schema.js";
import type { RunSession } from "../domain/run-flow.js";
import type { ContentTables } from "../domain/schema.js";
import { renderBattle, type BattleView } from "./battle-view.js";
import { renderRunMap, renderRunReward } from "./run-view.js";

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
  private stageNodeId: string | null = null;

  constructor(private readonly root: HTMLElement, initialBattle: HTMLElement) {
    const main = initialBattle.querySelector<HTMLElement>(".game");
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
    this.overlay.className = "game-shell-overlay";
    this.stage.append(this.overlay);
    root.replaceChildren(main);
  }

  get element(): HTMLElement { return this.main; }
  get typingInput(): HTMLInputElement { return this.input; }

  showBattle(run: RunState, content: ContentTables, view: BattleView, previous: HTMLElement): void {
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
    this.header.replaceChildren(...header.childNodes);
    this.hero.className = hero.className;
    this.hero.src = hero.src;
    this.hero.alt = hero.alt;
    this.hero.style.cssText = hero.style.cssText;
    this.actor.style.cssText = slot.style.cssText;
    slot.replaceWith(this.actor);
    this.actor.replaceChildren(this.hero, ...slot.childNodes);
    this.overlay.remove();
    this.stage.replaceChildren(...stage.childNodes, this.overlay);
    input.replaceWith(this.input);
    this.input.value = input.value;
    this.input.disabled = input.disabled;
    this.control.replaceChildren(...control.childNodes);
    this.main.dataset.screen = "combat";
    this.overlay.replaceChildren();
  }

  showOverlay(screen: "reward" | "map", rendered: HTMLElement): void {
    const panel = rendered.querySelector<HTMLElement>(screen === "reward" ? ".reward-panel" : ".map-panel");
    if (!panel) throw new Error(`Missing ${screen} panel`);
    this.overlay.replaceChildren(panel);
    this.main.dataset.screen = screen;
    this.input.disabled = true;
  }
}
