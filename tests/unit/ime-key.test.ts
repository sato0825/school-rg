import { describe, expect, it } from "vitest";
import { imeLatinKey } from "../../src/ui/ime-key.js";

describe("IME English card key resolution", () => {
  it("prefers the actual key character over physical position", () => {
    expect(imeLatinKey({ key: "a", code: "KeyQ" }, new Map([["KeyQ", "q"]]))).toBe("a");
  });

  it("uses a layout map for Process keys, including non-QWERTY layouts", () => {
    expect(imeLatinKey({ key: "Process", code: "KeyQ" }, new Map([["KeyQ", "a"]]))).toBe("a");
    expect(imeLatinKey({ key: "Process", code: "KeyQ" }, null)).toBeNull();
  });

  it("does not turn unsupported or non-letter keys into card input", () => {
    expect(imeLatinKey({ key: "Process", code: "Enter" }, new Map([["Enter", "Enter"]]))).toBeNull();
    expect(imeLatinKey({ key: "Process", code: "KeyQ" }, new Map([["KeyQ", "あ"]]))).toBeNull();
  });
});
