import { describe, expect, it } from "vitest";
import { isRigClub, rigForClub } from "../../src/ui/character-rigs.js";

describe("candidate rig registration", () => {
  it("keeps literature, music and art as distinct replaceable rigs", () => {
    expect(["literature-demo", "music-demo", "art-demo"].map((club) => rigForClub(club)?.id)).toEqual([
      "literature-v1", "music-v1", "art-v1",
    ]);
    for (const club of ["literature-demo", "music-demo", "art-demo"]) {
      expect(isRigClub(club)).toBe(true);
      expect(rigForClub(club)!.markup()).toContain('data-art-state="candidate"');
    }
    expect(rigForClub("science-demo")).toBeNull();
    expect(isRigClub("science-demo")).toBe(false);
  });
});
