/** Presentation-only candidate. Intent and damage remain owned by the domain. */
export type EnemyActionArt = { artId: string; version: string; attack: string; guard: string; hit: string };

export const enemyActionArtById: Readonly<Record<string, EnemyActionArt>> = {
  "paper-heap": {
    artId: "enemy-paper-heap-action",
    version: "candidate-v1",
    attack: new URL("../assets/enemies/actions/paper-heap-attack-windup-candidate-v1.png", import.meta.url).href,
    guard: new URL("../assets/enemies/actions/paper-heap-guard-windup-candidate-v1.png", import.meta.url).href,
    hit: new URL("../assets/enemies/actions/paper-heap-hit-candidate-v1.png", import.meta.url).href,
  },
};

/** The paper enemy has two authored action silhouettes. Unknown intents use idle. */
export function paperHeapActionForIntent(intentId: string): "attack" | "guard" | null {
  if (intentId === "paper-intent-hit") return "attack";
  if (intentId === "paper-intent-guard") return "guard";
  return null;
}
