import { describe, expect, it } from "vitest";
import { demoContent } from "../../src/content/demo-battle.js";
import { cardProfileForId, cardProfileMarkup, provisionalCardProfileCatalog } from "../../src/ui/card-profile.js";

describe("provisional display-only card profiles", () => {
  it("covers the current 84 IDs with the documented calibration counts", () => {
    expect(Object.keys(provisionalCardProfileCatalog).sort()).toEqual(demoContent.cards.map((card) => card.id).sort());
    expect(Object.values(provisionalCardProfileCatalog).filter((profile) => profile === "frequent")).toHaveLength(42);
    expect(Object.values(provisionalCardProfileCatalog).filter((profile) => profile === "occasional")).toHaveLength(28);
    expect(Object.values(provisionalCardProfileCatalog).filter((profile) => profile === "scarce")).toHaveLength(14);
    expect(cardProfileForId("BASE-003", provisionalCardProfileCatalog)).toBe("frequent");
  });

  it("does not turn missing or invalid assignments into a low tier", () => {
    expect(cardProfileForId("NEW-001", provisionalCardProfileCatalog)).toBeNull();
    expect(cardProfileForId("BASE-001", {})).toBeNull();
    expect(cardProfileForId("BASE-001", { "BASE-001": "unknown" as "frequent" })).toBeNull();
    expect(cardProfileMarkup(null)).toBe("");
  });
});
