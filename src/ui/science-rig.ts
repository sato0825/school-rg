import manifest from "../../docs/art/rigs/science-rig-candidate-v5.json";

const urls: Readonly<Record<string, string>> = {
  "left-leg": new URL("../../docs/art/candidates/science-rig-parts-v2/left-leg.png", import.meta.url).href,
  "right-leg": new URL("../../docs/art/candidates/science-rig-parts-v2/right-leg.png", import.meta.url).href,
  "skirt": new URL("../../docs/art/candidates/science-rig-parts-v2/skirt.png", import.meta.url).href,
  "torso": new URL("../../docs/art/candidates/science-rig-parts-v1/torso.png", import.meta.url).href,
  "right-arm-pen": new URL("../../docs/art/candidates/science-rig-parts-v1/right-arm-pen.png", import.meta.url).href,
  "left-arm-notebook": new URL("../../docs/art/candidates/science-rig-parts-v1/left-arm-notebook.png", import.meta.url).href,
  "head": new URL("../../docs/art/candidates/science-rig-parts-v1/head.png", import.meta.url).href,
  "head-hit": new URL("../../docs/art/candidates/science-rig-parts-v1/head-hit-v2.png", import.meta.url).href,
};

/** Science candidate layers share the stage anchor but retain independent joints. */
export function scienceRigMarkup(): string {
  const { width, height } = manifest.canvas;
  const parts = [...manifest.parts, ...manifest.expressionLayers].map((part) => {
    const url = urls[part.id];
    if (!url) throw new Error(`missing science rig layer: ${part.id}`);
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

export function scienceRigManifest() { return manifest; }
