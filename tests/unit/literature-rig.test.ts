import { describe, expect, it } from "vitest";
import { literatureRigManifest, literatureRigMarkup } from "../../src/ui/literature-rig.js";

describe("literature layered candidate", () => {
  it("retains six independently addressable joints on one ground-anchored canvas", () => {
    const rig = literatureRigManifest();
    expect(rig.status).toBe("candidate");
    expect(rig.characterId).toBe("literature-student");
    expect(rig.expressionLayers.map((part) => part.id)).toEqual(["head-hit"]);
    expect(rig.parts.map((part) => part.id)).toEqual([
      "left-leg", "right-leg", "torso", "left-arm-bag", "right-arm-notebook", "head",
    ]);
    expect(rig.groundY).toBeGreaterThan(0.95 * rig.canvas.height);
    for (const part of rig.parts) {
      expect(part.x + part.width).toBeLessThanOrEqual(rig.canvas.width);
      expect(part.y + part.height).toBeLessThanOrEqual(rig.canvas.height);
      expect(part.pivotX).toBeGreaterThan(0);
      expect(part.pivotY).toBeGreaterThan(0);
    }
  });

  it("renders separate art layers under a replaceable candidate ID", () => {
    const markup = literatureRigMarkup();
    expect(markup).toContain('data-rig-id="literature-rig-candidate-v2"');
    expect(markup).toContain('data-art-state="candidate"');
    expect(markup.match(/class="rig-part"/g)).toHaveLength(7);
    expect(markup).toContain('data-part="head-hit"');
    expect(markup).toContain('data-part="right-arm-notebook"');
    expect(markup).toContain('aria-hidden="true"');
  });
});
