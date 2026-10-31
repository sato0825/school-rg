/** Candidate card pictures are addressed by card ID, never by the input word.
 * This keeps the base and club cards with the same spelling independent.
 * The catalog is a presentation dependency, not a change to CardSchema.
 */
export type CardArtAsset = Readonly<{
  artId: string;
  version: string;
  url: string | null;
  state: "candidate" | "missing";
  sourceIssue: number | null;
}>;

export type CardArtCatalog = Readonly<Record<string, CardArtAsset>>;

const candidate = (cardId: string, version: string, fileUrl: string, sourceIssue: number): CardArtAsset => ({
  artId: `card.${cardId}`,
  version,
  url: fileUrl,
  state: "candidate",
  sourceIssue,
});

/** Small review set only. Missing IDs intentionally have no invented illustration. */
export const candidateCardArtCatalog: CardArtCatalog = Object.freeze({
  "BASE-001": candidate("BASE-001", "issue242-v2", new URL("../assets/cards/issue261/base-strike-candidate-v2.png", import.meta.url).href, 242),
  "BASE-002": candidate("BASE-002", "issue277-v1", new URL("../assets/cards/issue261/base-defend-candidate-v1.png", import.meta.url).href, 277),
  "BASE-003": candidate("BASE-003", "issue275-v2", new URL("../assets/cards/issue261/base-heavy-strike-candidate-v2.png", import.meta.url).href, 275),
  "BASE-007": candidate("BASE-007", "issue242-v2", new URL("../assets/cards/issue261/base-draw-candidate-v2.png", import.meta.url).href, 242),
  "BASE-011": candidate("BASE-011", "issue242-v2", new URL("../assets/cards/issue261/base-sweep-candidate-v2.png", import.meta.url).href, 242),
  "LIT-001": candidate("LIT-001", "issue246-v1", new URL("../assets/cards/issue261/lit-jot-candidate-v1.png", import.meta.url).href, 246),
  "LIT-002": candidate("LIT-002", "issue255-v1", new URL("../assets/cards/issue261/lit-leaf-candidate-v1.png", import.meta.url).href, 255),
  "LIT-003": candidate("LIT-003", "issue242-v2", new URL("../assets/cards/issue261/lit-verse-candidate-v2.png", import.meta.url).href, 242),
  "LIT-004": candidate("LIT-004", "issue242-v1", new URL("../assets/cards/issue261/lit-outline-candidate-v1.png", import.meta.url).href, 242),
  "LIT-005": candidate("LIT-005", "issue269-v3", new URL("../assets/cards/issue261/lit-reread-candidate-v3.png", import.meta.url).href, 269),
  "LIT-009": candidate("LIT-009", "issue269-v1", new URL("../assets/cards/issue261/lit-edit-candidate-v1.png", import.meta.url).href, 269),
  "SCI-001": candidate("SCI-001", "issue255-v1", new URL("../assets/cards/issue261/sci-sample-candidate-v1.png", import.meta.url).href, 255),
  "SCI-002": candidate("SCI-002", "issue277-v2", new URL("../assets/cards/issue261/sci-observe-candidate-v2.png", import.meta.url).href, 277),
  "SCI-003": candidate("SCI-003", "issue246-v2", new URL("../assets/cards/issue261/sci-reaction-candidate-v2.png", import.meta.url).href, 246),
  "SCI-004": candidate("SCI-004", "issue277-v2", new URL("../assets/cards/issue261/sci-formula-candidate-v2.png", import.meta.url).href, 277),
  "SCI-007": candidate("SCI-007", "issue269-v1", new URL("../assets/cards/issue261/sci-catalyst-candidate-v1.png", import.meta.url).href, 269),
  "SCI-009": candidate("SCI-009", "issue269-v3", new URL("../assets/cards/issue261/sci-buffer-candidate-v3.png", import.meta.url).href, 269),
  "KEN-001": candidate("KEN-001", "issue255-v2", new URL("../assets/cards/issue261/ken-parry-candidate-v2.png", import.meta.url).href, 255),
  "KEN-002": candidate("KEN-002", "issue277-v1", new URL("../assets/cards/issue261/ken-stance-candidate-v1.png", import.meta.url).href, 277),
  "KEN-003": candidate("KEN-003", "issue277-v1", new URL("../assets/cards/issue261/ken-thrust-candidate-v1.png", import.meta.url).href, 277),
  "KEN-006": candidate("KEN-006", "issue246-v2", new URL("../assets/cards/issue261/ken-final-cut-candidate-v2.png", import.meta.url).href, 246),
  "KEN-009": candidate("KEN-009", "issue269-v1", new URL("../assets/cards/issue261/ken-guard-step-candidate-v1.png", import.meta.url).href, 269),
  "KEN-011": candidate("KEN-011", "issue269-v2", new URL("../assets/cards/issue261/ken-hasso-candidate-v2.png", import.meta.url).href, 269),
  "MUS-001": candidate("MUS-001", "issue255-v1", new URL("../assets/cards/issue261/mus-tempo-candidate-v1.png", import.meta.url).href, 255),
  "MUS-002": candidate("MUS-002", "issue277-v1", new URL("../assets/cards/issue261/mus-beat-candidate-v1.png", import.meta.url).href, 277),
  "MUS-003": candidate("MUS-003", "issue277-v2", new URL("../assets/cards/issue261/mus-rest-candidate-v2.png", import.meta.url).href, 277),
  "MUS-005": candidate("MUS-005", "issue269-v1", new URL("../assets/cards/issue261/mus-chorus-candidate-v1.png", import.meta.url).href, 269),
  "MUS-010": candidate("MUS-010", "issue269-v1", new URL("../assets/cards/issue261/mus-riff-candidate-v1.png", import.meta.url).href, 269),
  "ART-001": candidate("ART-001", "issue277-v1", new URL("../assets/cards/issue261/art-sketch-candidate-v1.png", import.meta.url).href, 277),
  "ART-002": candidate("ART-002", "issue255-v1", new URL("../assets/cards/issue261/art-frame-candidate-v1.png", import.meta.url).href, 255),
  "ART-003": candidate("ART-003", "issue277-v2", new URL("../assets/cards/issue261/art-paint-candidate-v2.png", import.meta.url).href, 277),
  "ART-004": candidate("ART-004", "issue277-v1", new URL("../assets/cards/issue261/art-erase-candidate-v1.png", import.meta.url).href, 277),
  "ART-005": candidate("ART-005", "issue269-v3", new URL("../assets/cards/issue261/art-redraw-candidate-v3.png", import.meta.url).href, 269),
  "ART-012": candidate("ART-012", "issue269-v1", new URL("../assets/cards/issue261/art-triptych-candidate-v1.png", import.meta.url).href, 269),
});

/** Pass a replacement catalog after production art is approved. No rarity is inferred. */
export function cardArtForId(cardId: string, catalog: CardArtCatalog = candidateCardArtCatalog): CardArtAsset {
  return catalog[cardId] ?? {
    artId: `card.${cardId}`,
    version: "unassigned",
    url: null,
    state: "missing",
    sourceIssue: null,
  };
}
