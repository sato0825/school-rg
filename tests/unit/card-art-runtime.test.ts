import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { demoContent } from "../../src/content/demo-battle.js";
import { candidateCardArtCatalog, cardArtForId } from "../../src/ui/card-art.js";

type Provenance = { assets: { cardId: string; version: string; runtimePath: string; sha256: string; state: string; formalAdoption: boolean }[] };
const provenance = JSON.parse(readFileSync(new URL("../../src/assets/cards/issue329/provenance.json", import.meta.url), "utf8")) as Provenance;

describe("candidate card art runtime catalog", () => {
  it("covers 66 of the 84 cards by ID and leaves the other 18 visibly missing", () => {
    const ids = demoContent.cards.map((card) => card.id);
    expect(ids).toHaveLength(84);
    expect(Object.keys(candidateCardArtCatalog)).toHaveLength(66);
    expect(ids.filter((id) => cardArtForId(id).state === "candidate")).toHaveLength(66);
    expect(ids.filter((id) => cardArtForId(id).state === "missing")).toHaveLength(18);
    expect(cardArtForId("unknown").url).toBeNull();
  });

  it("uses distinct images for the two sweep cards and preserves the revised outline version", () => {
    const baseSweep = cardArtForId("BASE-011");
    const kendoSweep = cardArtForId("KEN-007");
    expect(baseSweep.url).not.toBe(kendoSweep.url);
    expect(baseSweep.sourceIssue).toBe(242);
    expect(kendoSweep.sourceIssue).toBe(314);
    expect(cardArtForId("LIT-004")).toMatchObject({ version: "issue296-v3", sourceIssue: 296, state: "candidate" });
  });

  it("matches every copied candidate to its recorded original digest without claiming adoption", () => {
    expect(provenance.assets).toHaveLength(12);
    for (const asset of provenance.assets) {
      const digest = createHash("sha256").update(readFileSync(fileURLToPath(new URL(`../../${asset.runtimePath}`, import.meta.url)))).digest("hex");
      expect(digest, asset.cardId).toBe(asset.sha256);
      expect(cardArtForId(asset.cardId).state).toBe(asset.state);
      if (!["BASE-023", "KEN-008"].includes(asset.cardId)) expect(cardArtForId(asset.cardId).version).toBe(asset.version);
      expect(asset.formalAdoption).toBe(false);
    }
  });
});
