import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cardArtForId } from "../../src/ui/card-art.js";

type Provenance = { assets: { cardId: string; version: string; runtimePath: string; sha256: string; sourceIssue: number; state: string; formalAdoption: boolean; rightsReview: string }[] };
const provenance = JSON.parse(readFileSync(new URL("../../src/assets/cards/issue341/provenance.json", import.meta.url), "utf8")) as Provenance;

describe("common action candidate art", () => {
  it("connects ten unique IDs and checks copied originals byte for byte", () => {
    expect(provenance.assets).toHaveLength(10);
    expect(new Set(provenance.assets.map((asset) => asset.cardId)).size).toBe(10);
    for (const asset of provenance.assets) {
      const digest = createHash("sha256").update(readFileSync(fileURLToPath(new URL(`../../${asset.runtimePath}`, import.meta.url)))).digest("hex");
      expect(digest, asset.cardId).toBe(asset.sha256);
      expect(cardArtForId(asset.cardId)).toMatchObject({ version: asset.version, state: "candidate", sourceIssue: 328 });
      expect(asset.state).toBe("candidate");
      expect(asset.formalAdoption).toBe(false);
      expect(asset.rightsReview).toBe("pending");
    }
  });

  it("uses the revised poison image and keeps opposing school actions distinct", () => {
    expect(cardArtForId("BASE-010")).toMatchObject({ version: "issue328-v2", sourceIssue: 328 });
    expect(cardArtForId("BASE-010").url).toContain("base-poison-candidate-v2");
    expect(cardArtForId("BASE-008").url).not.toBe(cardArtForId("BASE-009").url);
    expect(cardArtForId("BASE-014").url).not.toBe(cardArtForId("BASE-015").url);
    expect(cardArtForId("BASE-005").url).not.toBe(cardArtForId("BASE-002").url);
  });
});
