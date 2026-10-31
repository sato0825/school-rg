import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cardArtForId } from "../../src/ui/card-art.js";

type Asset = { cardId: string; version: string; runtimePath: string; originalPath: string; sha256: string;
  sourceIssue: number; sourceCommit: string; state: string; formalAdoption: boolean; rightsReview: string;
  priorRuntimePath?: string; priorSha256?: string };
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
      if (asset.priorRuntimePath) expect(digest(asset.priorRuntimePath), `${asset.cardId} prior`).toBe(asset.priorSha256);
      expect(cardArtForId(asset.cardId)).toMatchObject({ version: asset.version, state: "candidate", sourceIssue: 338 });
      expect(cardArtForId(asset.cardId).url).toContain(asset.runtimePath.split("/").at(-1)!);
      expect(asset.sourceCommit).toBe(asset.cardId === "BASE-022"
        ? "6fa4f9622ec2371de238c348180ac0c3c5bf8a71" : "48a3d839da3eac69db4f5d28593ee28c1cfdd44d");
      expect(asset.formalAdoption).toBe(false);
      expect(asset.rightsReview).toBe("pending");
    }
  });

  it("excludes misleading finish v1/v2 and thin kata v1 images", () => {
    expect(provenance.excludedSuperseded.map((row) => `${row.cardId}:${row.version}`).sort()).toEqual([
      "BASE-022:issue338-v1", "BASE-022:issue338-v2", "KEN-005:issue338-v1",
    ]);
    for (const row of provenance.excludedSuperseded) {
      expect(cardArtForId(row.cardId).version).toBe(row.cardId === "BASE-022" ? "issue338-v3" : "issue338-v2");
      expect(cardArtForId(row.cardId).url).not.toContain(row.originalPath.split("/").at(-1)!);
    }
  });
});
