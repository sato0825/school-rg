import { readFile } from "node:fs/promises";
import { URL } from "node:url";
import { describe, expect, it } from "vitest";
import { cutoutMargin, pngInfo } from "../../scripts/art-asset-checks.mjs";

describe("lost-and-found portrait revision", () => {
  it("puts the full visible creature inside the production safety margin", async () => {
    const previous = pngInfo(await readFile(new URL("../../src/assets/enemies/lost-and-found-candidate-v1.png", import.meta.url)));
    const revised = pngInfo(await readFile(new URL("../../src/assets/enemies/lost-and-found-candidate-v2.png", import.meta.url)));
    expect(() => cutoutMargin(previous)).toThrow(/safety margin/);
    expect(cutoutMargin(revised)).toBe(11);
  });
});
