import { artRigMarkup } from "./art-rig.js";
import { literatureRigMarkup } from "./literature-rig.js";
import { musicRigMarkup } from "./music-rig.js";

/** Candidate rig registration is separate from combat logic and demo-art enablement. */
const rigs: Readonly<Record<string, Readonly<{ id: string; markup: () => string }>>> = {
  "literature-demo": { id: "literature-v1", markup: literatureRigMarkup },
  "music-demo": { id: "music-v1", markup: musicRigMarkup },
  "art-demo": { id: "art-v1", markup: artRigMarkup },
};

export function rigForClub(clubId: string) { return rigs[clubId] ?? null; }
export function isRigClub(clubId: string): boolean { return Boolean(rigForClub(clubId)); }
