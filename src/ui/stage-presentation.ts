/** Environment plates stay separate from characters, enemies, effects and game rules. */
export const stageCandidateUrlByAct: Readonly<Record<number, string>> = {
  1: new URL("../assets/stage-hallway-v1.png", import.meta.url).href,
  2: new URL("../assets/stages/act2-science-wing-candidate-v1.png", import.meta.url).href,
  3: new URL("../assets/stages/act3-auditorium-foyer-candidate-v1.png", import.meta.url).href,
};

export function stageUrlForAct(art: { stageUrl: string; stageUrlByAct?: Readonly<Record<number, string>> }, act: number): string {
  return art.stageUrlByAct?.[act] ?? art.stageUrl;
}
