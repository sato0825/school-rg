import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cardArtForId } from "../../src/ui/card-art.js";

type Asset = { cardId: string; version: string; runtimePath: string; originalPath: string; sha256: string;
  priorRuntimePath: string; priorSha256: string; state: string; formalAdoption: boolean; rightsReview: string };
const provenance = JSON.parse(readFileSync(new URL("../../src/assets/cards/issue352/provenance.json", import.meta.url), "utf8")) as { assets: Asset[] };
const digest = (path: string) => createHash("sha256").update(readFileSync(fileURLToPath(new URL(`../../${path}`, import.meta.url)))).digest("hex");

describe("six revised card art candidates", () => {
  it("preserves six old originals and matches six preferred new bytes", () => {
    expect(provenance.assets).toHaveLength(6);
    expect(new Set(provenance.assets.map((asset) => asset.cardId)).size).toBe(6);
    for (const asset of provenance.assets) {
      expect(digest(asset.priorRuntimePath), `${asset.cardId} prior`).toBe(asset.priorSha256);
      expect(digest(asset.runtimePath), `${asset.cardId} revised`).toBe(asset.sha256);
      expect(asset.sha256).not.toBe(asset.priorSha256);
      expect(cardArtForId(asset.cardId)).toMatchObject({ version: asset.version, sourceIssue: 343, state: "candidate" });
      expect(asset.formalAdoption).toBe(false);
      expect(asset.rightsReview).toBe("pending");
    }
  });

  it("uses hasso v4 rather than the superseded v3 and does not change card coverage", () => {
    expect(cardArtForId("KEN-011").url).toContain("ken-hasso-candidate-v4");
    expect(cardArtForId("KEN-011").url).not.toContain("candidate-v3");
    expect(cardArtForId("BASE-017").url).toContain("base-boost-candidate-v3");
    expect(cardArtForId("BASE-023").url).toContain("base-delay-candidate-v2");
  });
});
