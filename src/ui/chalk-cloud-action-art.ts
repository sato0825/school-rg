import type { EnemyActionArt } from "./enemy-action-art.js";

/** #379 candidate asset mapping. Domain Intent IDs remain the only action source. */
export const chalkCloudActionArt = {
  enemyId: "chalk-cloud",
  artId: "enemy-chalk-cloud-action",
  version: "candidate-v1",
  intents: {
    "chalk-intent-hit": { pose: "attack", url: new URL("../assets/enemies/actions/chalk-cloud-attack-candidate-v1.png", import.meta.url).href },
    "chalk-intent-weak": { pose: "status", url: new URL("../assets/enemies/actions/chalk-cloud-weak-candidate-v1.png", import.meta.url).href },
  },
  hit: new URL("../assets/enemies/actions/chalk-cloud-hit-candidate-v1.png", import.meta.url).href,
} as const satisfies EnemyActionArt & { enemyId: string };
