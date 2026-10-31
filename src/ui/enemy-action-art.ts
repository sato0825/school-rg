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
  "night-announcement": {
    artId: "enemy-night-announcement-action",
    version: "candidate-v1",
    intents: {
      "announcement-intent-hit": { pose: "attack", url: new URL("../assets/enemies/actions/night-announcement-attack-candidate-v1.png", import.meta.url).href },
      "announcement-intent-frail": { pose: "status", url: new URL("../assets/enemies/actions/night-announcement-frail-candidate-v1.png", import.meta.url).href },
    },
    hit: new URL("../assets/enemies/actions/night-announcement-hit-candidate-v1.png", import.meta.url).href,
  },
  "window-shadow": {
    artId: "enemy-window-shadow-action",
    version: "candidate-v1",
    intents: {
      "window-intent-focus": { pose: "buff", url: new URL("../assets/enemies/actions/window-shadow-focus-candidate-v1.png", import.meta.url).href },
      "window-intent-hit": { pose: "attack", url: new URL("../assets/enemies/actions/window-shadow-attack-candidate-v1.png", import.meta.url).href },
    },
    hit: new URL("../assets/enemies/actions/window-shadow-hit-candidate-v1.png", import.meta.url).href,
  },
};

/** A missing asset remains idle; it must never borrow another enemy's pose. */
export function enemyActionForIntent(art: EnemyActionArt | undefined, intentId: string): EnemyIntentPose | null {
  return art?.intents[intentId] ?? null;
}
