import { basename } from "node:path";

/** A stable asset ID is also the exported bitmap's filename and includes its revision. */
export function validateArtVersion(asset) {
  if (asset.role === "reference") return;
  if (typeof asset.id !== "string" || !/-v[1-9][0-9]*$/.test(asset.id)) throw new Error(`art revision missing: ${asset.id}`);
  if (basename(asset.file ?? "") !== `${asset.id}.png`) throw new Error(`art ID/file mismatch: ${asset.id}`);
}

export function poseGeometry(info) {
  if (!info.alphaBounds) throw new Error("empty pose silhouette");
  const { left, top, right, bottom } = info.alphaBounds;
  const margin = Math.max(8, Math.ceil(Math.min(info.width, info.height) * 0.01));
  return {
    visibleHeight: (bottom - top + 1) / info.height,
    ground: (info.height - bottom - 1) / info.height,
    clipped: left < margin || top < margin || right >= info.width - margin || bottom >= info.height - margin,
  };
}

/** Geometry is a mechanical warning, not a judgment of facial or costume identity. */
export function poseGeometryFindings(entries) {
  const idle = entries.find(({ asset }) => asset.pose === "idle");
  const reference = idle ? poseGeometry(idle.info) : null;
  const findings = [];
  for (const { asset, info } of entries) {
    const current = poseGeometry(info);
    if (current.clipped) findings.push(`${asset.id}: visible pixels touch the 1%/8px safety margin`);
    if (!reference || asset.pose === "idle") continue;
    if (Math.abs(current.visibleHeight - reference.visibleHeight) > 0.08)
      findings.push(`${asset.id}: visible height differs from idle by over 8% of canvas`);
    if (Math.abs(current.ground - reference.ground) > 0.035)
      findings.push(`${asset.id}: ground line differs from idle by over 3.5% of canvas`);
  }
  return findings;
}

export function validateApprovedPoseSet(entries, characterId) {
  if (entries.length !== 3 || ["idle", "activate", "hit"].some((pose) => entries.filter(({ asset }) => asset.pose === pose).length !== 1))
    throw new Error(`approved motion states must have one version per pose: ${characterId}`);
  const findings = poseGeometryFindings(entries);
  if (findings.length) throw new Error(`approved pose geometry mismatch: ${findings.join("; ")}`);
}
