import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { candidateCardArtCatalog, cardArtForId } from "../../src/ui/card-art.js";

type Asset = { cardId: string; version: string; runtimePath: string; originalPath: string; sourceCommit: string;
  sha256: string; priorVersion: string; priorRuntimePath: string; priorSha256: string; state: string;
  formalAdoption: boolean; rightsReview: string };
const provenance = JSON.parse(readFileSync(new URL("../../src/assets/cards/issue372/provenance.json", import.meta.url), "utf8")) as { assets: Asset[] };
const digest = (path: string) => createHash("sha256").update(readFileSync(fileURLToPath(new URL(`../../${path}`, import.meta.url)))).digest("hex");

describe("three paired-action art revisions", () => {
  it("keeps original bytes, verifies new bytes, and marks all three as candidates", () => {
    expect(provenance.assets.map((asset) => asset.cardId).sort()).toEqual(["KEN-008", "LIT-009", "SCI-009"]);
    for (const asset of provenance.assets) {
      expect(digest(asset.priorRuntimePath), `${asset.cardId} prior`).toBe(asset.priorSha256);
      expect(digest(asset.runtimePath), `${asset.cardId} revised`).toBe(asset.sha256);
      expect(asset.sha256).not.toBe(asset.priorSha256);
      expect(cardArtForId(asset.cardId)).toMatchObject({ version: asset.version, sourceIssue: 343, state: "candidate" });
      expect(cardArtForId(asset.cardId).url).toContain(asset.runtimePath.split("/").at(-1)!);
      expect(asset.sourceCommit).toBe("87fbe83743ac85309e7a15369502ad3662b1fff8");
      expect(asset.formalAdoption).toBe(false);
      expect(asset.rightsReview).toBe("pending");
    }
  });

  it("does not change candidate coverage or reuse the paired card images", () => {
    expect(Object.keys(candidateCardArtCatalog)).toHaveLength(66);
    expect(cardArtForId("LIT-009").url).not.toBe(cardArtForId("LIT-005").url);
    expect(cardArtForId("SCI-009").url).not.toBe(cardArtForId("SCI-002").url);
    expect(cardArtForId("KEN-008").url).not.toBe(cardArtForId("KEN-002").url);
  });
});
