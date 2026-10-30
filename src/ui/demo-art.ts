import type { BattleArt } from "./battle-view.js";

/** Shared placeholder until #29/#68 supply distinct approved enemy art. */
const placeholderEnemyUrl = new URL("../assets/enemy-paper-v1.png", import.meta.url).href;

/** Demo presentation is kept outside battle logic so later club and enemy art can replace it. */
export const demoBattleArt: BattleArt = {
  stageUrl: new URL("../assets/stage-hallway-v1.png", import.meta.url).href,
  heroUrl: new URL("../assets/girl-notebook-v1.png", import.meta.url).href,
  enemyUrlById: {
    "paper-heap": placeholderEnemyUrl,
    "paper-scrap": placeholderEnemyUrl,
    "hall-monitor": placeholderEnemyUrl,
    "final-exam": placeholderEnemyUrl,
    "chalk-cloud": placeholderEnemyUrl,
    "library-cart": placeholderEnemyUrl,
    "club-auditor": placeholderEnemyUrl,
    "night-announcement": placeholderEnemyUrl,
    "lost-and-found": placeholderEnemyUrl,
    "closing-bell": placeholderEnemyUrl,
    "late-pass": placeholderEnemyUrl,
    "notice-board": placeholderEnemyUrl,
    "safety-sign": placeholderEnemyUrl,
    "stairwell-echo": placeholderEnemyUrl,
    "window-shadow": placeholderEnemyUrl,
    "night-locker": placeholderEnemyUrl,
  },
};

/** #84/#96/#112 development preview only. These candidate images are not approved runtime art. */
export const candidateBattleArt: BattleArt = {
  ...demoBattleArt,
  previewLabel: "制作候補プレビュー · 未採用",
  previewLabelByClubId: {
    "literature-demo": "文芸部候補 · 3ポーズ比較 · 未採用",
    "science-demo": "科学部候補 · 3ポーズ比較 · 未採用",
    "kendo-demo": "剣道部候補 · 3ポーズ比較 · 未採用",
    "music-demo": "軽音部候補 · 3ポーズ比較 · 未採用",
    "art-demo": "美術部候補 · 3ポーズ比較 · 未採用",
  },
  heroUrlByClubId: {
    "literature-demo": new URL("../../docs/art/candidates/literature-idle-candidate-v1.png", import.meta.url).href,
    "kendo-demo": new URL("../../docs/art/candidates/kendo-idle-candidate-v1.png", import.meta.url).href,
    "music-demo": new URL("../../docs/art/candidates/music-idle-candidate-v1.png", import.meta.url).href,
    "art-demo": new URL("../../docs/art/candidates/art-idle-candidate-v1.png", import.meta.url).href,
  },
  heroPosesByClubId: {
    "literature-demo": {
      idle: new URL("../../docs/art/candidates/literature-idle-candidate-v1.png", import.meta.url).href,
      activate: new URL("../../docs/art/candidates/literature-activate-candidate-v2.png", import.meta.url).href,
      hit: new URL("../../docs/art/candidates/literature-hit-candidate-v2.png", import.meta.url).href,
    },
    "science-demo": {
      idle: new URL("../../docs/art/candidates/serious-student-idle-candidate-v1.png", import.meta.url).href,
      activate: new URL("../../docs/art/candidates/serious-student-activate-candidate-v1.png", import.meta.url).href,
      hit: new URL("../../docs/art/candidates/serious-student-hit-candidate-v1.png", import.meta.url).href,
    },
    "kendo-demo": {
      idle: new URL("../../docs/art/candidates/kendo-idle-candidate-v1.png", import.meta.url).href,
      activate: new URL("../../docs/art/candidates/kendo-activate-candidate-v2.png", import.meta.url).href,
      hit: new URL("../../docs/art/candidates/kendo-hit-candidate-v2.png", import.meta.url).href,
    },
    "music-demo": {
      idle: new URL("../../docs/art/candidates/music-idle-candidate-v1.png", import.meta.url).href,
      activate: new URL("../../docs/art/candidates/music-activate-candidate-v2.png", import.meta.url).href,
      hit: new URL("../../docs/art/candidates/music-hit-candidate-v2.png", import.meta.url).href,
    },
    "art-demo": {
      idle: new URL("../../docs/art/candidates/art-idle-candidate-v1.png", import.meta.url).href,
      activate: new URL("../../docs/art/candidates/art-activate-candidate-v2.png", import.meta.url).href,
      hit: new URL("../../docs/art/candidates/art-hit-candidate-v2.png", import.meta.url).href,
    },
  },
};
