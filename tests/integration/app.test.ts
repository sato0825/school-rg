// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { mountApp } from "../../src/ui/app.js";

describe("app shell", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
  });

  it("mounts a truthful typing-game introduction", () => {
    const root = document.querySelector<HTMLElement>("#app");
    if (!root) throw new Error("Missing test root");
    mountApp(root);
    expect(root.querySelector("h1")?.textContent).toBe("学園タイピングローグライク");
    expect(root.textContent).toContain("カード名を直接入力");
    expect(root.textContent).toContain("戦闘はまだ実装されていません");
  });
});
