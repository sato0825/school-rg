import manifest from "../../docs/art/rigs/kendo-rig-candidate-v1.json";

const urls: Readonly<Record<string, string>> = {
  "shinai-bag": new URL("../../docs/art/candidates/kendo-rig-parts-v1/shinai-bag.png", import.meta.url).href,
  "left-leg": new URL("../../docs/art/candidates/kendo-rig-parts-v1/left-leg.png", import.meta.url).href,
  "right-leg": new URL("../../docs/art/candidates/kendo-rig-parts-v1/right-leg.png", import.meta.url).href,
  "torso": new URL("../../docs/art/candidates/kendo-rig-parts-v1/torso.png", import.meta.url).href,
  "left-arm": new URL("../../docs/art/candidates/kendo-rig-parts-v1/left-arm.png", import.meta.url).href,
  "right-arm-shinai": new URL("../../docs/art/candidates/kendo-rig-parts-v1/right-arm-shinai.png", import.meta.url).href,
  "head": new URL("../../docs/art/candidates/kendo-rig-parts-v1/head.png", import.meta.url).href,
  "head-hit": new URL("../../docs/art/candidates/kendo-rig-parts-v1/head-hit.png", import.meta.url).href,
};

/** Render one candidate rig without changing card, enemy, or save state. */
export function kendoRigMarkup(): string {
  const { width, height } = manifest.canvas;
  const parts = [...manifest.parts, ...manifest.expressionLayers].map((part) => {
    const url = urls[part.id];
    if (!url) throw new Error(`missing kendo rig layer: ${part.id}`);
    const left = (part.x / width * 100).toFixed(5);
    const top = (part.y / height * 100).toFixed(5);
    const partWidth = (part.width / width * 100).toFixed(5);
    const partHeight = (part.height / height * 100).toFixed(5);
    const pivotX = (part.pivotX / part.width * 100).toFixed(5);
    const pivotY = (part.pivotY / part.height * 100).toFixed(5);
    return `<img class="rig-part" data-part="${part.id}" src="${url}" alt="" style="left:${left}%;top:${top}%;width:${partWidth}%;height:${partHeight}%;transform-origin:${pivotX}% ${pivotY}%" />`;
  }).join("");
  return `<div class="hero-rig" data-rig-id="${manifest.id}" data-art-state="${manifest.status}" style="--rig-scale:${manifest.runtimeScale}" aria-hidden="true">${parts}</div>`;
}

export function kendoRigManifest() { return manifest; }
