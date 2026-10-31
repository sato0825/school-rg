/** Presentation-only, replaceable acquisition-frequency hypothesis for #247/#316. */
export type CardProfile = "frequent" | "occasional" | "scarce";
export type CardProfileCatalog = Readonly<Record<string, CardProfile>>;

const profileMeta: Record<CardProfile, { label: string; shape: string }> = {
  frequent: { label: "よく出る", shape: '<circle cx="8" cy="8" r="5.2" />' },
  occasional: { label: "ときどき", shape: '<path d="M8 2 14 8 8 14 2 8Z" />' },
  scarce: { label: "まれ", shape: '<path d="M8 1 10 6 15 8 10 10 8 15 6 10 1 8 6 6Z" />' },
};

/** ID-order calibration only: no approved odds, strength or production rarity. */
function provisionalCatalog(): CardProfileCatalog {
  const catalog: Record<string, CardProfile> = {};
  for (const number of [1, 2, 3, 4, 5, 6, 7, 8, 11, 13, 16, 17]) catalog[`BASE-${String(number).padStart(3, "0")}`] = "frequent";
  for (const number of [9, 10, 12, 14, 15, 18, 19, 20]) catalog[`BASE-${String(number).padStart(3, "0")}`] = "occasional";
  for (const number of [21, 22, 23, 24]) catalog[`BASE-${String(number).padStart(3, "0")}`] = "scarce";
  for (const club of ["LIT", "SCI", "KEN", "MUS", "ART"]) {
    for (let number = 1; number <= 12; number += 1) {
      catalog[`${club}-${String(number).padStart(3, "0")}`] = number <= 6 ? "frequent" : number <= 10 ? "occasional" : "scarce";
    }
  }
  return Object.freeze(catalog);
}

export const provisionalCardProfileCatalog = provisionalCatalog();
export const emptyCardProfileCatalog: CardProfileCatalog = Object.freeze({});

/** Candidate allocation never ships by default; release can inject an approved catalog later. */
export function cardProfilesForBuild(isDevelopment: boolean): CardProfileCatalog {
  return isDevelopment ? provisionalCardProfileCatalog : emptyCardProfileCatalog;
}

export function cardProfileForId(cardId: string, catalog: CardProfileCatalog): CardProfile | null {
  const profile = catalog[cardId];
  return profile && Object.hasOwn(profileMeta, profile) ? profile : null;
}

export function cardProfileLabel(profile: CardProfile): string {
  return profileMeta[profile].label;
}

/** All words/shapes are fixed literals, so the markup contains no card-sourced HTML. */
export function cardProfileMarkup(profile: CardProfile | null): string {
  if (!profile) return "";
  const { label, shape } = profileMeta[profile];
  return `<span class="card-profile" data-profile="${profile}" role="img" aria-label="仮の入手頻度: ${label}"><svg viewBox="0 0 16 16" aria-hidden="true">${shape}</svg><span aria-hidden="true">${label}</span></span>`;
}
