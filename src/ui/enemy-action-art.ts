/** Presentation-only assets. Intent choice and effects remain owned by the domain. */
export type EnemyActionPose = "attack" | "guard" | "status" | "buff" | "summon" | "mixed" | "prepare" | "heavy";
export type EnemyIntentPose = { pose: EnemyActionPose; url: string };
export type EnemyActionArt = {
  artId: string;
  version: string;
  /** Explicit Intent IDs prevent a mixed effect from being guessed as one generic category. */
  intents: Readonly<Record<string, EnemyIntentPose>>;
  hit: string;
};

export const enemyActionArtById: Readonly<Record<string, EnemyActionArt>> = {
  "paper-heap": {
    artId: "enemy-paper-heap-action",
    version: "candidate-v2",
    intents: {
      "paper-intent-hit": { pose: "attack", url: new URL("../assets/enemies/actions/paper-heap-attack-windup-candidate-v2.png", import.meta.url).href },
      "paper-intent-guard": { pose: "guard", url: new URL("../assets/enemies/actions/paper-heap-guard-windup-candidate-v2.png", import.meta.url).href },
    },
    hit: new URL("../assets/enemies/actions/paper-heap-hit-candidate-v2.png", import.meta.url).href,
  },
  "closing-bell": {
    artId: "enemy-closing-bell-action",
    version: "candidate-v1",
    intents: {
      "bell-intent-hit": { pose: "attack", url: new URL("../assets/enemies/actions/closing-bell-attack-candidate-v1.png", import.meta.url).href },
      "bell-intent-guard": { pose: "guard", url: new URL("../assets/enemies/actions/closing-bell-guard-candidate-v1.png", import.meta.url).href },
    },
    hit: new URL("../assets/enemies/actions/closing-bell-hit-candidate-v1.png", import.meta.url).href,
  },
  "graduation-curtain": {
    artId: "enemy-graduation-curtain-action",
    version: "candidate-v1",
    intents: {
      "curtain-intent-hit": { pose: "attack", url: new URL("../assets/enemies/actions/graduation-curtain-attack-candidate-v1.png", import.meta.url).href },
      "curtain-intent-prepare": { pose: "prepare", url: new URL("../assets/enemies/actions/graduation-curtain-prepare-candidate-v1.png", import.meta.url).href },
    },
    hit: new URL("../assets/enemies/actions/graduation-curtain-hit-candidate-v1.png", import.meta.url).href,
  },
};

/** A missing asset remains idle; it must never borrow another enemy's pose. */
export function enemyActionForIntent(art: EnemyActionArt | undefined, intentId: string): EnemyIntentPose | null {
  return art?.intents[intentId] ?? null;
}
