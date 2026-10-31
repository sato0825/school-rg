import { describe, expect, it } from "vitest";
import { scienceRigManifest, scienceRigMarkup } from "../../src/ui/science-rig.js";

describe("science layered candidate", () => {
  it("keeps identity, editable joints, expression and ground in one canvas", () => {
    const rig = scienceRigManifest();
    expect(rig.status).toBe("candidate");
    expect(rig.characterId).toBe("science-student");
    expect(rig.parts.map((part) => part.id)).toEqual([
      "lower-body", "torso", "right-arm-pen", "left-arm-notebook", "head",
    ]);
    expect(rig.expressionLayers.map((part) => part.id)).toEqual(["head-hit"]);
    expect(rig.editableSource).toMatch(/\.ora$/);
    expect(rig.groundY).toBeGreaterThan(.95 * rig.canvas.height);
    for (const part of [...rig.parts, ...rig.expressionLayers]) {
      expect(part.x + part.width).toBeLessThanOrEqual(rig.canvas.width);
      expect(part.y + part.height).toBeLessThanOrEqual(rig.canvas.height);
      expect(part.pivotX).toBeGreaterThan(0);
      expect(part.pivotY).toBeGreaterThan(0);
    }
  });

  it("renders six addressable candidate layers for the battle actor", () => {
    const markup = scienceRigMarkup();
    expect(markup).toContain('data-rig-id="science-rig-candidate-v4"');
    expect(markup.match(/class="rig-part"/g)).toHaveLength(6);
    expect(markup).toContain('data-part="right-arm-pen"');
    expect(markup).toContain('data-part="head-hit"');
    expect(markup).toContain('aria-hidden="true"');
  });
});
