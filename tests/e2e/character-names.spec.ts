import { expect, test } from "@playwright/test";

const identities = [
  ["文芸部", "吉野 こはる", "よしの こはる"],
  ["科学部", "水野 さき", "みずの さき"],
  ["剣道部", "佐伯 りつ", "さえき りつ"],
  ["軽音部", "朝倉 みな", "あさくら みな"],
  ["美術部", "森下 いろは", "もりした いろは"],
] as const;

test("five provisional names identify distinct clubs without changing run IDs", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/?shortRun=1&seed=42");
  await page.getByRole("button", { name: "ランを始める" }).click();

  for (const [club, name, reading] of identities) {
    const choice = page.getByRole("button", { name: new RegExp(`${reading}、${club}`) });
    await expect(choice).toBeVisible();
    await expect(choice).toContainText(name);
    await expect(choice).toContainText("人物名は仮称");
  }

  await page.getByRole("button", { name: /みずの さき、科学部/ }).click();
  await page.locator(".map-node.available").first().click();
  await expect(page.locator(".hero-nameplate")).toHaveText("さき");
  await expect(page.locator(".hero-nameplate")).toHaveAttribute("data-name-status", "provisional");
  await expect(page.getByRole("img", { name: "みずの さき（科学部）" })).toBeVisible();
  await expect(page.locator(".player-hud")).toHaveAttribute("aria-label", "みずの さき、科学部の状態");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.clubId)).toBe("science-demo");

  await page.reload();
  await expect(page.locator(".hero-nameplate")).toHaveText("さき");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("school-rg-run-v1")!).session.run.clubId)).toBe("science-demo");
});
