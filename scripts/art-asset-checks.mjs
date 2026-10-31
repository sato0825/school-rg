import { Buffer } from "node:buffer";
import { inflateSync } from "node:zlib";
import { JSDOM } from "jsdom";

function assert(condition, message) { if (!condition) throw new Error(message); }

/** Read the alpha geometry without changing or recompressing the supplied art. */
export function pngInfo(bytes) {
  assert(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), "not a PNG");
  let offset = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = -1, interlace = -1;
  const compressed = [];
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const kind = bytes.toString("ascii", offset + 4, offset + 8);
    assert(offset + 12 + length <= bytes.length, "truncated PNG chunk");
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (kind === "IHDR") {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9]; interlace = data[12];
    } else if (kind === "IDAT") compressed.push(data);
    offset += 12 + length;
    if (kind === "IEND") break;
  }
  assert(width > 0 && height > 0 && width <= 4096 && height <= 4096, "invalid PNG size");
  assert(bitDepth === 8 && (colorType === 2 || colorType === 6) && interlace === 0, "art checker supports RGB/RGBA 8-bit non-interlaced PNG");
  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const pixels = inflateSync(Buffer.concat(compressed), { maxOutputLength: (stride + 1) * height });
  assert(pixels.length === (stride + 1) * height, "PNG pixel data length mismatch");
  let previous = Buffer.alloc(stride);
  let minAlpha = 255, maxAlpha = colorType === 6 ? 0 : 255;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  let cursor = 0;
  for (let rowIndex = 0; rowIndex < height; rowIndex++) {
    const filter = pixels[cursor++];
    assert(filter >= 0 && filter <= 4, "unsupported PNG filter");
    const row = Buffer.allocUnsafe(stride);
    for (let index = 0; index < stride; index++) {
      const raw = pixels[cursor++];
      const left = index >= channels ? row[index - channels] : 0;
      const above = previous[index];
      const upperLeft = index >= channels ? previous[index - channels] : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = above;
      else if (filter === 3) predictor = Math.floor((left + above) / 2);
      else if (filter === 4) {
        const p = left + above - upperLeft;
        const a = Math.abs(p - left), b = Math.abs(p - above), c = Math.abs(p - upperLeft);
        predictor = a <= b && a <= c ? left : b <= c ? above : upperLeft;
      }
      row[index] = (raw + predictor) & 255;
    }
    if (channels === 4) for (let index = 3; index < stride; index += 4) {
      const alpha = row[index];
      minAlpha = Math.min(minAlpha, alpha);
      maxAlpha = Math.max(maxAlpha, alpha);
      if (alpha >= 16) {
        const x = (index - 3) / 4;
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, rowIndex); maxY = Math.max(maxY, rowIndex);
      }
    }
    previous = row;
  }
  return { width, height, minAlpha, maxAlpha,
    alphaBounds: maxX < 0 ? null : { left: minX, top: minY, right: maxX, bottom: maxY } };
}

/** At least one percent of the shorter canvas edge, with an eight-pixel floor. */
export function cutoutMargin(info) {
  assert(info.alphaBounds, "visible cutout is empty");
  const margin = Math.max(8, Math.ceil(Math.min(info.width, info.height) * 0.01));
  const { left, top, right, bottom } = info.alphaBounds;
  assert(left >= margin && top >= margin && right < info.width - margin && bottom < info.height - margin,
    `cutout touches safety margin (${margin}px): ${left},${top}..${right},${bottom}`);
  return margin;
}

/** An SVG source must expose separately editable vector parts, not a flattened bitmap wrapper. */
export function validateSvgSource(source, editableParts) {
  assert(typeof source === "string" && !/<!DOCTYPE/i.test(source), "SVG source is invalid or contains a DOCTYPE");
  assert(Array.isArray(editableParts) && editableParts.length >= 2 && new Set(editableParts).size === editableParts.length
    && editableParts.every((part) => typeof part === "string" && /^[A-Za-z][\w-]*$/.test(part)), "editableParts requires distinct named parts");
  const document = new JSDOM(source, { contentType: "image/svg+xml" }).window.document;
  const root = document.documentElement;
  assert(root.localName === "svg" && root.namespaceURI === "http://www.w3.org/2000/svg" && root.hasAttribute("viewBox"), "SVG root and viewBox are required");
  const forbidden = new Set(["image", "foreignObject", "script", "style", "use", "iframe"]);
  const geometry = new Set(["path", "rect", "circle", "ellipse", "line", "polyline", "polygon"]);
  for (const element of [root, ...root.querySelectorAll("*")]) {
    assert(!forbidden.has(element.localName), `flattened or external SVG element: ${element.localName}`);
    for (const attribute of element.attributes) {
      if (attribute.localName === "href") assert(attribute.value.startsWith("#"), `external SVG reference: ${attribute.value}`);
      if (/url\(/i.test(attribute.value)) assert(!/url\(\s*['\"]?(?!#)/i.test(attribute.value), `external SVG URL: ${attribute.value}`);
      assert(!/^on/i.test(attribute.localName), `SVG event handler: ${attribute.localName}`);
    }
  }
  for (const part of editableParts) {
    const group = [...root.querySelectorAll("g[id]")].find((element) => element.getAttribute("id") === part);
    assert(group && [...group.querySelectorAll("*")].some((element) => geometry.has(element.localName)), `editable vector part missing: ${part}`);
  }
  return editableParts.length;
}
