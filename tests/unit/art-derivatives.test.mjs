import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { cropFor, projectPath, PROFILES } from "../../scripts/art-derivatives.mjs";

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

describe("candidate art derivatives", () => {
  it("keeps the focal point within a wide hand crop", () => {
    const crop = cropFor(1536, 1024, ...PROFILES["hand-1x"], 0.45, 0.5);
    expect(crop).toEqual({ resizedWidth: 160, resizedHeight: 107, x: 0, y: 18,
      width: 160, height: 72, sourceCrop: { x: 0, y: 173, width: 1536, height: 691 } });
  });

  it("clamps edge focal points and rejects invalid input", () => {
    const left = cropFor(1000, 500, 100, 100, 0, 0);
    const right = cropFor(1000, 500, 100, 100, 1, 1);
    expect(left.x).toBe(0);
    expect(right.x).toBe(100);
    expect(() => cropFor(1000, 500, 100, 100, -0.1, 0.5)).toThrow();
    expect(() => cropFor(0, 500, 100, 100, 0.5, 0.5)).toThrow();
  });

  it("rejects paths outside the repository", () => {
    expect(() => projectPath("../../outside.png")).toThrow(/escapes repository/);
    expect(projectPath("docs/art/production/derivatives/issue255-config.json")).toMatch(/issue255-config\.json$/);
  });

  it("keeps all committed candidates and derivatives tied to their source SHA", () => {
    const manifest = JSON.parse(readFileSync(projectPath("docs/art/production/derivatives/issue255-manifest.json"), "utf8"));
    expect(manifest.records).toHaveLength(30);
    expect(new Set(manifest.records.map((item) => item.id))).toHaveProperty("size", 5);
    for (const item of manifest.records) {
      expect(sha256(readFileSync(projectPath(item.path)))).toBe(item.sha256);
      expect(sha256(readFileSync(projectPath(item.sourcePath)))).toBe(item.sourceSha256);
      expect(item.sourceState).toBe("draft-candidate");
      expect(item.editableSource).toBeNull();
      expect(item.rightsReview).toBe("pending");
      expect(item.visualReview).toBe("pending");
      expect([item.width, item.height]).toEqual(PROFILES[item.profile]);
    }
  });
});
