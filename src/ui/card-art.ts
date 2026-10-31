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
  "BASE-004": candidate("BASE-004", "issue328-v1", new URL("../assets/cards/issue341/base-quick-attack-candidate-v1.png", import.meta.url).href, 328),
  "BASE-005": candidate("BASE-005", "issue328-v1", new URL("../assets/cards/issue341/base-guard-candidate-v1.png", import.meta.url).href, 328),
  "BASE-006": candidate("BASE-006", "issue328-v1", new URL("../assets/cards/issue341/base-heal-candidate-v1.png", import.meta.url).href, 328),
  "BASE-007": candidate("BASE-007", "issue242-v2", new URL("../assets/cards/issue261/base-draw-candidate-v2.png", import.meta.url).href, 242),
  "BASE-008": candidate("BASE-008", "issue328-v1", new URL("../assets/cards/issue341/base-strengthen-candidate-v1.png", import.meta.url).href, 328),
  "BASE-009": candidate("BASE-009", "issue328-v1", new URL("../assets/cards/issue341/base-weaken-candidate-v1.png", import.meta.url).href, 328),
  "BASE-010": candidate("BASE-010", "issue328-v2", new URL("../assets/cards/issue341/base-poison-candidate-v2.png", import.meta.url).href, 328),
  "BASE-011": candidate("BASE-011", "issue242-v2", new URL("../assets/cards/issue261/base-sweep-candidate-v2.png", import.meta.url).href, 242),
  "BASE-012": candidate("BASE-012", "issue328-v1", new URL("../assets/cards/issue341/base-pierce-candidate-v1.png", import.meta.url).href, 328),
  "BASE-013": candidate("BASE-013", "issue242-v1", new URL("../assets/cards/issue261/base-counter-candidate-v1.png", import.meta.url).href, 242),
  "BASE-014": candidate("BASE-014", "issue328-v1", new URL("../assets/cards/issue341/base-recover-candidate-v1.png", import.meta.url).href, 328),
  "BASE-015": candidate("BASE-015", "issue328-v1", new URL("../assets/cards/issue341/base-exhaust-candidate-v1.png", import.meta.url).href, 328),
  "BASE-016": candidate("BASE-016", "issue284-v1", new URL("../assets/cards/issue261/base-duplicate-candidate-v1.png", import.meta.url).href, 284),
  "BASE-017": candidate("BASE-017", "issue343-v4", new URL("../assets/cards/issue352/base-boost-candidate-v4.png", import.meta.url).href, 343),
  "BASE-018": candidate("BASE-018", "issue328-v1", new URL("../assets/cards/issue341/base-cleanse-candidate-v1.png", import.meta.url).href, 328),
  "BASE-019": candidate("BASE-019", "issue338-v1", new URL("../assets/cards/issue367/card-base-barrier-v1.png", import.meta.url).href, 338),
  "BASE-020": candidate("BASE-020", "issue338-v1", new URL("../assets/cards/issue367/card-base-focus-v1.png", import.meta.url).href, 338),
  "BASE-021": candidate("BASE-021", "issue338-v1", new URL("../assets/cards/issue367/card-base-sacrifice-v1.png", import.meta.url).href, 338),
  "BASE-022": candidate("BASE-022", "issue338-v3", new URL("../assets/cards/issue367/card-base-finish-v3.png", import.meta.url).href, 338),
  "BASE-023": candidate("BASE-023", "issue343-v2", new URL("../assets/cards/issue352/base-delay-candidate-v2.png", import.meta.url).href, 343),
  "BASE-024": candidate("BASE-024", "issue338-v1", new URL("../assets/cards/issue367/card-base-shield-break-v1.png", import.meta.url).href, 338),
  "LIT-001": candidate("LIT-001", "issue246-v1", new URL("../assets/cards/issue261/lit-jot-candidate-v1.png", import.meta.url).href, 246),
  "LIT-002": candidate("LIT-002", "issue255-v1", new URL("../assets/cards/issue261/lit-leaf-candidate-v1.png", import.meta.url).href, 255),
  "LIT-003": candidate("LIT-003", "issue242-v2", new URL("../assets/cards/issue261/lit-verse-candidate-v2.png", import.meta.url).href, 242),
  "LIT-004": candidate("LIT-004", "issue296-v3", new URL("../assets/cards/issue329/lit-outline-candidate-v3.png", import.meta.url).href, 296),
  "LIT-005": candidate("LIT-005", "issue269-v3", new URL("../assets/cards/issue261/lit-reread-candidate-v3.png", import.meta.url).href, 269),
  "LIT-006": candidate("LIT-006", "issue284-v1", new URL("../assets/cards/issue261/lit-proof-candidate-v1.png", import.meta.url).href, 284),
  "LIT-007": candidate("LIT-007", "issue314-v1", new URL("../assets/cards/issue329/lit-aside-candidate-v1.png", import.meta.url).href, 314),
  "LIT-009": candidate("LIT-009", "issue269-v1", new URL("../assets/cards/issue261/lit-edit-candidate-v1.png", import.meta.url).href, 269),
  "LIT-010": candidate("LIT-010", "issue338-v1", new URL("../assets/cards/issue367/card-lit-bookmark-v1.png", import.meta.url).href, 338),
  "LIT-012": candidate("LIT-012", "issue314-v1", new URL("../assets/cards/issue329/lit-anthology-candidate-v1.png", import.meta.url).href, 314),
  "SCI-001": candidate("SCI-001", "issue255-v1", new URL("../assets/cards/issue261/sci-sample-candidate-v1.png", import.meta.url).href, 255),
  "SCI-002": candidate("SCI-002", "issue277-v2", new URL("../assets/cards/issue261/sci-observe-candidate-v2.png", import.meta.url).href, 277),
  "SCI-003": candidate("SCI-003", "issue246-v2", new URL("../assets/cards/issue261/sci-reaction-candidate-v2.png", import.meta.url).href, 246),
  "SCI-004": candidate("SCI-004", "issue277-v2", new URL("../assets/cards/issue261/sci-formula-candidate-v2.png", import.meta.url).href, 277),
  "SCI-005": candidate("SCI-005", "issue284-v1", new URL("../assets/cards/issue261/sci-distill-candidate-v1.png", import.meta.url).href, 284),
  "SCI-006": candidate("SCI-006", "issue284-v1", new URL("../assets/cards/issue261/sci-quarantine-candidate-v1.png", import.meta.url).href, 284),
  "SCI-007": candidate("SCI-007", "issue269-v1", new URL("../assets/cards/issue261/sci-catalyst-candidate-v1.png", import.meta.url).href, 269),
  "SCI-008": candidate("SCI-008", "issue314-v1", new URL("../assets/cards/issue329/sci-assay-candidate-v1.png", import.meta.url).href, 314),
  "SCI-009": candidate("SCI-009", "issue269-v3", new URL("../assets/cards/issue261/sci-buffer-candidate-v3.png", import.meta.url).href, 269),
  "SCI-010": candidate("SCI-010", "issue314-v1", new URL("../assets/cards/issue329/sci-culture-candidate-v1.png", import.meta.url).href, 314),
  "SCI-011": candidate("SCI-011", "issue338-v1", new URL("../assets/cards/issue367/card-sci-test-tube-v1.png", import.meta.url).href, 338),
  "KEN-001": candidate("KEN-001", "issue255-v2", new URL("../assets/cards/issue261/ken-parry-candidate-v2.png", import.meta.url).href, 255),
  "KEN-002": candidate("KEN-002", "issue343-v2", new URL("../assets/cards/issue352/ken-stance-candidate-v2.png", import.meta.url).href, 343),
  "KEN-003": candidate("KEN-003", "issue277-v1", new URL("../assets/cards/issue261/ken-thrust-candidate-v1.png", import.meta.url).href, 277),
  "KEN-004": candidate("KEN-004", "issue343-v2", new URL("../assets/cards/issue352/ken-riposte-candidate-v2.png", import.meta.url).href, 343),
  "KEN-005": candidate("KEN-005", "issue338-v2", new URL("../assets/cards/issue367/card-ken-kata-v2.png", import.meta.url).href, 338),
  "KEN-006": candidate("KEN-006", "issue246-v2", new URL("../assets/cards/issue261/ken-final-cut-candidate-v2.png", import.meta.url).href, 246),
  "KEN-007": candidate("KEN-007", "issue314-v1", new URL("../assets/cards/issue329/ken-sweep-candidate-v1.png", import.meta.url).href, 314),
  "KEN-008": candidate("KEN-008", "issue314-v1", new URL("../assets/cards/issue329/ken-breath-candidate-v1.png", import.meta.url).href, 314),
  "KEN-009": candidate("KEN-009", "issue343-v2", new URL("../assets/cards/issue352/ken-guard-step-candidate-v2.png", import.meta.url).href, 343),
  "KEN-011": candidate("KEN-011", "issue343-v4", new URL("../assets/cards/issue352/ken-hasso-candidate-v4.png", import.meta.url).href, 343),
  "MUS-001": candidate("MUS-001", "issue255-v1", new URL("../assets/cards/issue261/mus-tempo-candidate-v1.png", import.meta.url).href, 255),
  "MUS-002": candidate("MUS-002", "issue277-v1", new URL("../assets/cards/issue261/mus-beat-candidate-v1.png", import.meta.url).href, 277),
  "MUS-003": candidate("MUS-003", "issue277-v2", new URL("../assets/cards/issue261/mus-rest-candidate-v2.png", import.meta.url).href, 277),
  "MUS-004": candidate("MUS-004", "issue284-v1", new URL("../assets/cards/issue261/mus-sync-candidate-v1.png", import.meta.url).href, 284),
  "MUS-005": candidate("MUS-005", "issue269-v1", new URL("../assets/cards/issue261/mus-chorus-candidate-v1.png", import.meta.url).href, 269),
  "MUS-006": candidate("MUS-006", "issue284-v1", new URL("../assets/cards/issue261/mus-crescendo-candidate-v1.png", import.meta.url).href, 284),
  "MUS-007": candidate("MUS-007", "issue314-v1", new URL("../assets/cards/issue329/mus-bridge-candidate-v1.png", import.meta.url).href, 314),
  "MUS-008": candidate("MUS-008", "issue314-v1", new URL("../assets/cards/issue329/mus-refrain-candidate-v1.png", import.meta.url).href, 314),
  "MUS-009": candidate("MUS-009", "issue338-v1", new URL("../assets/cards/issue367/card-mus-pickup-v1.png", import.meta.url).href, 338),
  "MUS-010": candidate("MUS-010", "issue269-v1", new URL("../assets/cards/issue261/mus-riff-candidate-v1.png", import.meta.url).href, 269),
  "ART-001": candidate("ART-001", "issue277-v1", new URL("../assets/cards/issue261/art-sketch-candidate-v1.png", import.meta.url).href, 277),
  "ART-002": candidate("ART-002", "issue255-v1", new URL("../assets/cards/issue261/art-frame-candidate-v1.png", import.meta.url).href, 255),
  "ART-003": candidate("ART-003", "issue277-v2", new URL("../assets/cards/issue261/art-paint-candidate-v2.png", import.meta.url).href, 277),
  "ART-004": candidate("ART-004", "issue277-v1", new URL("../assets/cards/issue261/art-erase-candidate-v1.png", import.meta.url).href, 277),
  "ART-005": candidate("ART-005", "issue269-v3", new URL("../assets/cards/issue261/art-redraw-candidate-v3.png", import.meta.url).href, 269),
  "ART-006": candidate("ART-006", "issue284-v2", new URL("../assets/cards/issue261/art-mural-candidate-v2.png", import.meta.url).href, 284),
  "ART-007": candidate("ART-007", "issue314-v1", new URL("../assets/cards/issue329/art-wash-candidate-v1.png", import.meta.url).href, 314),
  "ART-008": candidate("ART-008", "issue284-v1", new URL("../assets/cards/issue261/art-layer-candidate-v1.png", import.meta.url).href, 284),
  "ART-009": candidate("ART-009", "issue314-v1", new URL("../assets/cards/issue329/art-primer-candidate-v1.png", import.meta.url).href, 314),
  "ART-010": candidate("ART-010", "issue338-v1", new URL("../assets/cards/issue367/card-art-palette-v1.png", import.meta.url).href, 338),
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
