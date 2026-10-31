/** Replaceable display names. These proposals are tracked by Issue #188, not approved character canon. */
export type CharacterIdentity = {
  fullName: string;
  shortName: string;
  reading: string;
  status: "provisional";
};

export const characterIdentities = {
  "literature-demo": { fullName: "吉野 こはる", shortName: "こはる", reading: "よしの こはる", status: "provisional" },
  "science-demo": { fullName: "水野 さき", shortName: "さき", reading: "みずの さき", status: "provisional" },
  "kendo-demo": { fullName: "佐伯 りつ", shortName: "りつ", reading: "さえき りつ", status: "provisional" },
  "music-demo": { fullName: "朝倉 みな", shortName: "みな", reading: "あさくら みな", status: "provisional" },
  "art-demo": { fullName: "森下 いろは", shortName: "いろは", reading: "もりした いろは", status: "provisional" },
} as const satisfies Record<string, CharacterIdentity>;

export function identityForClub(clubId: string): CharacterIdentity | undefined {
  return characterIdentities[clubId as keyof typeof characterIdentities];
}
