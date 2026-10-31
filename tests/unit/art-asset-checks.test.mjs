import { Buffer } from "node:buffer";
import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { cutoutMargin, pngInfo, validateSvgSource } from "../../scripts/art-asset-checks.mjs";

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  return Buffer.concat([length, Buffer.from(type), data, Buffer.alloc(4)]);
}
function cutout(bounds) {
  const width = 32, height = 32;
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6;
  const rows = Buffer.concat(Array.from({ length: height }, (_, y) => {
    const row = Buffer.alloc(width * 4);
    for (let x = 0; x < width; x++) if (x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom) {
      row[x * 4] = 255; row[x * 4 + 3] = 255;
    }
    return Buffer.concat([Buffer.from([0]), row]);
  }));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header), chunk("IDAT", deflateSync(rows)), chunk("IEND", Buffer.alloc(0))]);
}

describe("art production checks", () => {
  it("measures visible cutout bounds and rejects art clipped at an edge", () => {
    const safe = pngInfo(cutout({ left: 8, top: 8, right: 23, bottom: 23 }));
    expect(safe.alphaBounds).toEqual({ left: 8, top: 8, right: 23, bottom: 23 });
    expect(cutoutMargin(safe)).toBe(8);
    const clipped = pngInfo(cutout({ left: 0, top: 8, right: 23, bottom: 23 }));
    expect(() => cutoutMargin(clipped)).toThrow(/touches safety margin/);
  });

  it("accepts separate editable vectors and rejects a flattened or externally linked SVG", () => {
    const source = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><g id="face"><circle cx="8" cy="8" r="4"/></g><g id="body"><path d="M4 8 L12 8 L8 24 Z"/></g></svg>`;
    expect(validateSvgSource(source, ["face", "body"])).toBe(2);
    const localGradient = source.replace('<g id="face">', '<defs><linearGradient id="ink"><stop offset="0" stop-color="#123"/></linearGradient></defs><g id="face" fill="url(\'#ink\')">');
    expect(validateSvgSource(localGradient, ["face", "body"])).toBe(2);
    expect(() => validateSvgSource(source, ["face", "arm"])).toThrow(/part missing/);
    expect(() => validateSvgSource(source.replace("</svg>", '<image href="data:image/png;base64,AA"/></svg>'), ["face", "body"])).toThrow(/flattened/);
    expect(() => validateSvgSource(source.replace('d="M4 8 L12 8 L8 24 Z"', 'd="M4 8 L12 8 L8 24 Z" fill="url(https://example.org/ink.svg)"'), ["face", "body"])).toThrow(/external SVG URL/);
    expect(() => validateSvgSource(source, ["face", "face"])).toThrow(/distinct/);
  });
});
