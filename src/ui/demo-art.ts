import type { BattleArt } from "./battle-view.js";
import { clubPresentation } from "./club-presentation.js";

/** Shared placeholder until #29/#68 supply distinct approved enemy art. */
const placeholderEnemyUrl = new URL("../assets/enemy-paper-v1.png", import.meta.url).href;

/** Demo presentation is kept outside battle logic so later club and enemy art can replace it. */
export const demoBattleArt: BattleArt = {
  stageUrl: new URL("../assets/stage-hallway-v1.png", import.meta.url).href,
  heroUrl: clubPresentation["literature-demo"].idle,
  heroUrlByClubId: Object.fromEntries(Object.entries(clubPresentation).map(([id, art]) => [id, art.idle])),
  heroPosesByClubId: Object.fromEntries(Object.entries(clubPresentation).map(([id, art]) => [id, { idle: art.idle, activate: art.activate, hit: art.hit }])),
  fxPaletteByClubId: {
    "literature-demo": ["#f14a70", "#ffd3dc"],
    "science-demo": ["#25afcc", "#c1f4fa"],
    "kendo-demo": ["#4f91e6", "#d5e9ff"],
    "music-demo": ["#9b62e2", "#e7d3ff"],
    "art-demo": ["#30a994", "#c5f0de"],
  },
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
    "lost-homework": placeholderEnemyUrl,
    "school-gate": placeholderEnemyUrl,
    "lab-magnet": placeholderEnemyUrl,
    "library-index": placeholderEnemyUrl,
    "empty-desk": placeholderEnemyUrl,
    "last-bus": placeholderEnemyUrl,
    "gym-scoreboard": placeholderEnemyUrl,
    "lab-ventilation": placeholderEnemyUrl,
    "graduation-curtain": placeholderEnemyUrl,
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
};
