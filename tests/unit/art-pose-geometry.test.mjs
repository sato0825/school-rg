import { describe, expect, it } from "vitest";
import { poseGeometryFindings, validateApprovedPoseSet, validateArtVersion } from "../../scripts/art-pose-geometry.mjs";

const entry = (id, pose, bounds) => ({
  asset: { id, pose },
  info: { width: 1000, height: 1500, alphaBounds: bounds },
});
const idle = entry("student-idle-v1", "idle", { left: 150, top: 40, right: 850, bottom: 1460 });

describe("art pose production gate", () => {
  it("requires revisioned files without changing reference naming", () => {
    expect(() => validateArtVersion({ role: "character-pose", id: "student-idle-v2", file: "docs/art/candidates/student-idle-v2.png" })).not.toThrow();
    expect(() => validateArtVersion({ role: "reference", id: "direction", file: "docs/art/reference/approved-direction.png" })).not.toThrow();
    expect(() => validateArtVersion({ role: "character-pose", id: "student-idle", file: "docs/art/candidates/student-idle.png" })).toThrow(/revision missing/);
    expect(() => validateArtVersion({ role: "character-pose", id: "student-idle-v2", file: "docs/art/candidates/student-idle-v1.png" })).toThrow(/mismatch/);
  });

  it("accepts stable ground and scale but reports clipping and jumping", () => {
    const stable = entry("student-hit-v1", "hit", { left: 170, top: 55, right: 830, bottom: 1450 });
    expect(poseGeometryFindings([idle, stable])).toEqual([]);
    const clipped = entry("student-activate-v1", "activate", { left: 0, top: 40, right: 900, bottom: 1460 });
    const scaled = entry("student-hit-v2", "hit", { left: 200, top: 230, right: 800, bottom: 1370 });
    const findings = poseGeometryFindings([idle, clipped, scaled]);
    expect(findings).toEqual(expect.arrayContaining([
      expect.stringMatching(/safety margin/),
      expect.stringMatching(/visible height differs/),
      expect.stringMatching(/ground line differs/),
    ]));
  });

  it("requires exactly one approved version of each pose", () => {
    const activate = entry("student-activate-v1", "activate", { left: 120, top: 35, right: 880, bottom: 1455 });
    const hit = entry("student-hit-v1", "hit", { left: 170, top: 55, right: 830, bottom: 1450 });
    expect(() => validateApprovedPoseSet([idle, activate, hit], "student")).not.toThrow();
    expect(() => validateApprovedPoseSet([idle, activate, activate], "student")).toThrow(/one version per pose/);
    expect(() => validateApprovedPoseSet([idle, activate, hit, hit], "student")).toThrow(/one version per pose/);
    const clipped = entry("student-hit-v2", "hit", { left: 0, top: 55, right: 830, bottom: 1450 });
    expect(() => validateApprovedPoseSet([idle, activate, clipped], "student")).toThrow(/geometry mismatch/);
  });
});
