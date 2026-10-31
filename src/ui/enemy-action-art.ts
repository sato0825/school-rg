/** Presentation-only candidate. Intent and damage remain owned by the domain. */
export type EnemyActionPose = { kind: "attack" | "guard" | "prepare" | "debuff" | "buff"; image: string };
export type EnemyActionArt = {
  artId: string;
  version: string;
  hit: string;
  attack?: string;
  guard?: string;
  /** Each authored silhouette belongs to a specific live Intent, not a category guess. */
  intentPoses?: Readonly<Record<string, EnemyActionPose>>;
};

export const enemyActionArtById: Readonly<Record<string, EnemyActionArt>> = {
  "paper-heap": {
    artId: "enemy-paper-heap-action",
    version: "candidate-v2",
    attack: new URL("../assets/enemies/actions/paper-heap-attack-windup-candidate-v2.png", import.meta.url).href,
    guard: new URL("../assets/enemies/actions/paper-heap-guard-windup-candidate-v2.png", import.meta.url).href,
    hit: new URL("../assets/enemies/actions/paper-heap-hit-candidate-v2.png", import.meta.url).href,
  },
  "closing-bell": {
    artId: "enemy-closing-bell-action",
    version: "candidate-v1",
    hit: new URL("../assets/enemies/actions/closing-bell-hit-candidate-v1.png", import.meta.url).href,
    intentPoses: {
      "bell-intent-hit": { kind: "attack", image: new URL("../assets/enemies/actions/closing-bell-attack-candidate-v1.png", import.meta.url).href },
      "bell-intent-guard": { kind: "guard", image: new URL("../assets/enemies/actions/closing-bell-guard-candidate-v1.png", import.meta.url).href },
    },
  },
  "graduation-curtain": {
    artId: "enemy-graduation-curtain-action",
    version: "candidate-v1",
    hit: new URL("../assets/enemies/actions/graduation-curtain-hit-candidate-v1.png", import.meta.url).href,
    intentPoses: {
      "curtain-intent-hit": { kind: "attack", image: new URL("../assets/enemies/actions/graduation-curtain-attack-candidate-v1.png", import.meta.url).href },
      "curtain-intent-prepare": { kind: "prepare", image: new URL("../assets/enemies/actions/graduation-curtain-prepare-candidate-v1.png", import.meta.url).href },
    },
  },
};

/** The paper enemy has two authored action silhouettes. Unknown intents use idle. */
export function paperHeapActionForIntent(intentId: string): "attack" | "guard" | null {
  if (intentId === "paper-intent-hit") return "attack";
  if (intentId === "paper-intent-guard") return "guard";
  return null;
}
