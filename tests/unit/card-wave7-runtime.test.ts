import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cardArtForId } from "../../src/ui/card-art.js";

type Asset = { cardId: string; version: string; runtimePath: string; originalPath: string; sha256: string;
  sourceIssue: number; sourceCommit: string; state: string; formalAdoption: boolean; rightsReview: string };
type Excluded = { cardId: string; version: string; originalPath: string; sha256: string };
const provenance = JSON.parse(readFileSync(new URL("../../src/assets/cards/issue367/provenance.json", import.meta.url), "utf8")) as
  { assets: Asset[]; excludedSuperseded: Excluded[] };
const digest = (path: string) => createHash("sha256").update(readFileSync(fileURLToPath(new URL(`../../${path}`, import.meta.url)))).digest("hex");

describe("#338 wave seven runtime candidate images", () => {
  it("addresses ten separate card IDs with source-bound bytes and no adoption claim", () => {
    expect(provenance.assets).toHaveLength(10);
    expect(new Set(provenance.assets.map((asset) => asset.cardId)).size).toBe(10);
    for (const asset of provenance.assets) {
      expect(digest(asset.runtimePath), asset.cardId).toBe(asset.sha256);
      expect(cardArtForId(asset.cardId)).toMatchObject({ version: asset.version, state: "candidate", sourceIssue: 338 });
      expect(cardArtForId(asset.cardId).url).toContain(asset.runtimePath.split("/").at(-1)!);
      expect(asset.sourceCommit).toBe("48a3d839da3eac69db4f5d28593ee28c1cfdd44d");
      expect(asset.formalAdoption).toBe(false);
      expect(asset.rightsReview).toBe("pending");
    }
  });

  it("excludes misleading finish and thin kata v1 images", () => {
    expect(provenance.excludedSuperseded.map((row) => row.cardId).sort()).toEqual(["BASE-022", "KEN-005"]);
    for (const row of provenance.excludedSuperseded) {
      expect(row.version).toBe("issue338-v1");
      expect(cardArtForId(row.cardId).version).toBe("issue338-v2");
      expect(cardArtForId(row.cardId).url).not.toContain(row.originalPath.split("/").at(-1)!);
    }
  });
});
