// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { mountApp } from "../../src/ui/app.js";

describe("typing combat HUD", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
  });

  it("shows combat state and ignores a wrong key", () => {
    const root = document.querySelector<HTMLElement>("#app");
    if (!root) throw new Error("Missing test root");
    const unmount = mountApp(root);
    expect(root.querySelector("h1")?.textContent).toBe("学園タイピングローグライク");
    expect(root.querySelectorAll(".card")).toHaveLength(5);
    expect(root.textContent).toContain("飛び散る答案");
    expect(root.textContent).toContain("山札 5");
    expect(root.textContent).toContain("捨て札 0");
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", bubbles: true }));
    expect(root.querySelector(".typing-buffer")?.textContent).toContain("ここに入力が表示されます");
    unmount();
  });
});
