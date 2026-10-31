import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { demoContent } from "../../src/content/demo-battle.js";
import { candidatePotionArt, candidateRelicArt, potionArtForId, potionEffectText, relicArtForId, relicInventoryMarkup, relicRuleText } from "../../src/ui/item-art.js";

it("maps every playable relic and potion to a versioned candidate derivative with intact source hashes", () => {
  const manifest = JSON.parse(readFileSync("docs/art/production/issue308/runtime-manifest.json", "utf8"));
  expect(Object.keys(candidateRelicArt).sort()).toEqual(demoContent.relics.map((item) => item.id).sort());
  expect(Object.keys(candidatePotionArt).sort()).toEqual(demoContent.potions.map((item) => item.id).sort());
  expect(Object.keys(relicRuleText).sort()).toEqual(Object.keys(candidateRelicArt).sort());
  for (const entry of [...manifest.relics, ...manifest.potions]) {
    const item = entry.artId.startsWith("relic.") ? relicArtForId(entry.id) : potionArtForId(entry.id);
    expect(item).toMatchObject({ artId: entry.artId, version: entry.version, state: "candidate" });
    expect(createHash("sha256").update(readFileSync(entry.source)).digest("hex")).toBe(entry.sourceSha256);
    expect(createHash("sha256").update(readFileSync(entry.runtime)).digest("hex")).toBe(entry.runtimeSha256);
  }
  expect(relicArtForId("unknown")).toMatchObject({ state: "missing", url: null });
  expect(potionArtForId("unknown")).toMatchObject({ state: "missing", url: null });
});

it("keeps item art and exact accessible effects in the owned inventory", () => {
  expect(relicInventoryMarkup(["library-bookmark"], demoContent)).toContain('data-art-id="relic.library-bookmark"');
  expect(relicInventoryMarkup(["library-bookmark"], demoContent)).toContain("取得時に2G");
  expect(potionEffectText("potion-time", demoContent)).toBe("入力時間を3秒延長");
  expect(potionEffectText("potion-heal", demoContent)).toBe("自分のHPを5回復");
  expect(potionEffectText("potion-ink", demoContent)).toBe("選んだ敵に7ダメージ");
});
