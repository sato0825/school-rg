import { describe, expect, it } from "vitest";
import { musicRigManifest, musicRigMarkup } from "../../src/ui/music-rig.js";

describe("music club layered candidate", () => {
  it("keeps seven editable anchors for its own clothes and guitar case", () => {
    const rig = musicRigManifest();
    expect(rig.status).toBe("candidate");
    expect(rig.characterId).toBe("music-student");
    expect(rig.parts.map((part) => part.id)).toEqual(["case", "left-leg", "right-leg", "torso", "left-arm", "right-arm", "head"]);
    expect(rig.expressionLayers.map((part) => part.id)).toEqual(["head-hit"]);
    expect(rig.groundY).toBeGreaterThan(1500);
  });

  it("renders independent image layers for the persistent battle actor", () => {
    const markup = musicRigMarkup();
    expect(markup).toContain('data-rig-id="music-rig-candidate-v2"');
    expect(markup).toContain('data-art-state="candidate"');
    expect(markup.match(/class="rig-part"/g)).toHaveLength(8);
    expect(markup).toContain('data-part="case"');
    expect(markup).toContain('data-part="right-arm"');
    expect(markup).toContain('aria-hidden="true"');
  });
});
