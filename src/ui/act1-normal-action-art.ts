import type { EnemyActionArt } from "./enemy-action-art.js";

/** #374 candidate poses; each live Intent ID chooses its own shape. */
export const act1NormalActionArtById: Readonly<Record<string, EnemyActionArt>> = {
  "late-pass": {
    artId: "enemy-late-pass-action", version: "candidate-v1",
    intents: {
      "late-pass-intent-hit": { pose: "attack", url: new URL("../assets/enemies/actions/late-pass-attack-candidate-v1.png", import.meta.url).href },
      "late-pass-intent-weak": { pose: "status", url: new URL("../assets/enemies/actions/late-pass-debuff-candidate-v1.png", import.meta.url).href },
    },
    hit: new URL("../assets/enemies/actions/late-pass-hit-candidate-v1.png", import.meta.url).href,
  },
  "lost-homework": {
    artId: "enemy-lost-homework-action", version: "candidate-v1",
    intents: {
      "homework-intent-hit": { pose: "attack", url: new URL("../assets/enemies/actions/lost-homework-attack-candidate-v1.png", import.meta.url).href },
      "homework-intent-weak": { pose: "status", url: new URL("../assets/enemies/actions/lost-homework-debuff-candidate-v1.png", import.meta.url).href },
    },
    hit: new URL("../assets/enemies/actions/lost-homework-hit-candidate-v1.png", import.meta.url).href,
  },
  "folded-school-map": {
    artId: "enemy-folded-school-map-action", version: "candidate-v1",
    intents: {
      "map-intent-hit": { pose: "attack", url: new URL("../assets/enemies/actions/folded-school-map-attack-candidate-v1.png", import.meta.url).href },
      "map-intent-call": { pose: "summon", url: new URL("../assets/enemies/actions/folded-school-map-summon-candidate-v1.png", import.meta.url).href },
    },
    hit: new URL("../assets/enemies/actions/folded-school-map-hit-candidate-v1.png", import.meta.url).href,
  },
};
