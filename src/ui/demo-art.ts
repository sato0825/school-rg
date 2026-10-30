import type { BattleArt } from "./battle-view.js";

/** Demo presentation is kept outside battle logic so later club and enemy art can replace it. */
export const demoBattleArt: BattleArt = {
  stageUrl: new URL("../assets/stage-hallway-v1.png", import.meta.url).href,
  heroUrl: new URL("../assets/girl-notebook-v1.png", import.meta.url).href,
  enemyUrlById: {
    "paper-heap": new URL("../assets/enemy-paper-v1.png", import.meta.url).href,
  },
};
