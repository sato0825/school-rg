import type { BattleArt } from "./battle-view.js";
import { clubPresentation } from "./club-presentation.js";
import { enemyCandidateUrlById } from "./enemy-presentation.js";
import { stageCandidateUrlByAct, stageCandidateUrlByActPhase } from "./stage-presentation.js";

/** Demo presentation is kept outside battle logic so later club and enemy art can replace it. */
export const demoBattleArt: BattleArt = {
  stageUrl: stageCandidateUrlByAct[1]!,
  stageUrlByAct: stageCandidateUrlByAct,
  stageUrlByActPhase: stageCandidateUrlByActPhase,
  heroUrl: clubPresentation["literature-demo"].idle,
  heroUrlByClubId: Object.fromEntries(Object.entries(clubPresentation).map(([id, art]) => [id, art.idle])),
  heroPosesByClubId: Object.fromEntries(Object.entries(clubPresentation).map(([id, art]) => [id, { idle: art.idle, activate: art.activate, hit: art.hit }])),
  heroRigCandidateIds: ["literature-demo"],
  fxPaletteByClubId: {
    "literature-demo": ["#f14a70", "#ffd3dc"],
    "science-demo": ["#25afcc", "#c1f4fa"],
    "kendo-demo": ["#4f91e6", "#d5e9ff"],
    "music-demo": ["#9b62e2", "#e7d3ff"],
    "art-demo": ["#30a994", "#c5f0de"],
  },
  enemyUrlById: enemyCandidateUrlById,
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
