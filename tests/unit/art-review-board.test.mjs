import { describe, expect, it } from "vitest";
import { renderArtReviewBoard } from "../../scripts/art-review-board.mjs";

const reference = { id: "ref", role: "reference", file: "docs/art/reference/ref.png", status: "direction-approved" };
const pose = (id, type, referenceId = "ref") => ({
  id, role: "character-pose", characterId: "serious-student", pose: type, referenceId,
  file: `docs/art/candidates/${id}.png`, status: "candidate", width: 1024, height: 1536,
  sha256: "f".repeat(64), editableSource: null,
});
const decisions = { version: 1, reviews: [{ characterId: "serious-student", status: "pending", reviewFile: "docs/art/review-2026-10-31.md", note: "同一性は未判定" }] };

describe("art review board", () => {
  it("shows old and new poses at the same size with provenance and a pending decision", () => {
    const register = { version: 1, assets: [reference, pose("idle-v1", "idle"), pose("idle-v2", "idle", "idle-v1"), pose("act-v1", "activate"), pose("hit-v1", "hit")] };
    const html = renderArtReviewBoard(register, decisions);
    expect(html).toContain("idle-v1");
    expect(html).toContain("idle-v2");
    expect(html).toContain("判定: 未完");
    expect(html).toContain("編集可能原本: なし");
    expect(html).toContain("比較候補・未採用");
    expect(html).toContain("object-fit:contain");
    expect(html).toContain("同一性は未判定");
  });

  it("keeps missing poses visible and rejects missing decisions or reference cycles", () => {
    const register = { version: 1, assets: [reference, pose("idle-v1", "idle")] };
    expect(renderArtReviewBoard(register, decisions)).toContain("候補なし");
    expect(() => renderArtReviewBoard(register, { version: 1, reviews: [] })).toThrow(/review record missing/);
    expect(() => renderArtReviewBoard({ version: 1, assets: [reference, pose("idle-v1", "idle", "idle-v1")] }, decisions)).toThrow(/reference cycle/);
  });
});
