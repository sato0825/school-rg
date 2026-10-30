import { expect, test } from "@playwright/test";

test("loads the typing-game shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "学園タイピングローグライク" })).toBeVisible();
  await expect(page.getByText("戦闘はまだ実装されていません。")).toBeVisible();
});
