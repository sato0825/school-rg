import { COMBAT_INPUT_MODE } from "../domain/index.js";

export function mountApp(root: HTMLElement): void {
  if (COMBAT_INPUT_MODE !== "typing") {
    throw new Error("Unsupported combat input mode");
  }

  root.innerHTML = `
    <main class="intro">
      <p class="eyebrow">SCHOOL · ROGUELIKE</p>
      <h1>学園タイピングローグライク</h1>
      <p>カード名を直接入力して発動する戦闘を開発中です。</p>
      <p class="status">戦闘はまだ実装されていません。</p>
    </main>
  `;
}
