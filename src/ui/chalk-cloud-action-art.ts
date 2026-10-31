/** #379 candidate asset mapping. Domain Intent IDs remain the only action source. */
export const chalkCloudActionArt = {
  enemyId: "chalk-cloud",
  artId: "enemy-chalk-cloud-action",
  version: "candidate-v1",
  poses: {
    attack: new URL("../assets/enemies/actions/chalk-cloud-attack-candidate-v1.png", import.meta.url).href,
    weak: new URL("../assets/enemies/actions/chalk-cloud-weak-candidate-v1.png", import.meta.url).href,
    hit: new URL("../assets/enemies/actions/chalk-cloud-hit-candidate-v1.png", import.meta.url).href,
  },
  intentPoseById: {
    "chalk-intent-hit": "attack",
    "chalk-intent-weak": "weak",
  },
} as const;
