import manifest from "../../docs/art/rigs/art-rig-candidate-v2.json";

const urls: Readonly<Record<string, string>> = {
  "head": new URL("../../docs/art/candidates/art-rig-parts-v2/head.png", import.meta.url).href,
  "head-hit": new URL("../../docs/art/candidates/art-rig-parts-v2/head-hit.png", import.meta.url).href,
  "torso": new URL("../../docs/art/candidates/art-rig-parts-v2/torso.png", import.meta.url).href,
  "left-arm-board": new URL("../../docs/art/candidates/art-rig-parts-v2/left-arm-board.png", import.meta.url).href,
  "right-arm-brush": new URL("../../docs/art/candidates/art-rig-parts-v2/right-arm-brush.png", import.meta.url).href,
  "left-leg": new URL("../../docs/art/candidates/art-rig-parts-v2/left-leg.png", import.meta.url).href,
  "right-leg": new URL("../../docs/art/candidates/art-rig-parts-v2/right-leg.png", import.meta.url).href,
};

/** Seven editable art-club layers with a fixed floor anchor. */
export function artRigMarkup(): string {
  const { width, height } = manifest.canvas;
  const parts = [...manifest.parts, ...manifest.expressionLayers].map((part) => {
    const url = urls[part.id];
    if (!url) throw new Error(`missing art rig layer: ${part.id}`);
    const left = (part.x / width * 100).toFixed(5);
    const top = (part.y / height * 100).toFixed(5);
    const partWidth = (part.width / width * 100).toFixed(5);
    const partHeight = (part.height / height * 100).toFixed(5);
    const pivotX = (part.pivotX / part.width * 100).toFixed(5);
    const pivotY = (part.pivotY / part.height * 100).toFixed(5);
    const scale = "renderScale" in part ? part.renderScale : 1;
    return `<img class="rig-part" data-part="${part.id}" src="${url}" alt="" style="left:${left}%;top:${top}%;width:${partWidth}%;height:${partHeight}%;transform-origin:${pivotX}% ${pivotY}%;scale:${scale}" />`;
  }).join("");
  return `<div class="hero-rig" data-rig-id="${manifest.id}" data-art-state="${manifest.status}" style="--rig-scale:${manifest.runtimeScale}" aria-hidden="true">${parts}<span class="rig-paint-trace"></span><span class="rig-art-token"></span></div>`;
}

export function artRigManifest() { return manifest; }
