import type { EncounterCandidate } from "../domain/run-flow.js";

/** #238 provisional late-floor pairs. Distinct IDs keep the seeded cycle and saves stable. */
export const normalFormationsByAct: Readonly<Record<1 | 2 | 3, readonly EncounterCandidate[]>> = {
  1: [
    { id: "act1-map-and-scrap", enemyIds: ["folded-school-map", "paper-scrap"], minFloor: 5 },
    { id: "act1-mop-and-pass", enemyIds: ["hall-mop", "late-pass"], minFloor: 6 },
    { id: "act1-homework-and-heap", enemyIds: ["lost-homework", "paper-heap"], minFloor: 7 },
  ],
  2: [
    { id: "act2-cloud-and-coil", enemyIds: ["chalk-cloud", "lab-coil"], minFloor: 5 },
    { id: "act2-sign-and-mist", enemyIds: ["safety-sign", "beaker-mist"], minFloor: 6 },
    { id: "act2-magnet-and-cloud", enemyIds: ["lab-magnet", "chalk-cloud"], minFloor: 7 },
  ],
  3: [
    { id: "act3-announcement-and-light", enemyIds: ["night-announcement", "stage-spotlight"], minFloor: 5 },
    { id: "act3-window-and-clock", enemyIds: ["window-shadow", "archive-clock"], minFloor: 6 },
    { id: "act3-desk-and-announcement", enemyIds: ["empty-desk", "night-announcement"], minFloor: 7 },
  ],
};
