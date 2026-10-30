import type { BattleArt } from "./battle-view.js";

/** Demo presentation is kept outside battle logic so later club and enemy art can replace it. */
export const demoBattleArt: BattleArt = {
  stageUrl: new URL("../assets/stage-hallway-v1.png", import.meta.url).href,
  heroUrl: new URL("../assets/girl-notebook-v1.png", import.meta.url).href,
  enemyUrlById: {
    "paper-heap": new URL("../assets/enemy-paper-v1.png", import.meta.url).href,
    "final-exam": new URL("../assets/enemy-paper-v1.png", import.meta.url).href,
  },
};

/** #84 development preview only. These candidate poses are not approved runtime art. */
export const candidateBattleArt: BattleArt = {
  ...demoBattleArt,
  previewLabel: "制作候補プレビュー · 未採用",
  heroPosesByClubId: {
    "science-demo": {
      idle: new URL("../../docs/art/candidates/serious-student-idle-candidate-v1.png", import.meta.url).href,
      activate: new URL("../../docs/art/candidates/serious-student-activate-candidate-v1.png", import.meta.url).href,
      hit: new URL("../../docs/art/candidates/serious-student-hit-candidate-v1.png", import.meta.url).href,
    },
  },
};
