import { test, expect } from "@playwright/test";

test.describe("Wizard Flow", () => {
  test("welcome page renders with all skill levels", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Move your WordPress site to the future");
    await expect(page.getByText("I'm new to this")).toBeVisible();
    await expect(page.getByText("I know my way around")).toBeVisible();
    await expect(page.getByText("Just give me the input fields")).toBeVisible();
  });

  test("novice level navigates to step 1 without 404", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Novice/ }).click();
    await expect(page).toHaveURL(/\/step\/1\?level=novice/);
    await expect(page.locator("text=Step 1 of 7")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Install WP Plugin" })).toBeVisible();
  });

  test("medium level navigates to step 1", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Medium/ }).click();
    await expect(page).toHaveURL(/\/step\/1\?level=medium/);
    await expect(page.locator("text=Step 1 of 7")).toBeVisible();
  });

  test("expert level navigates to step 1", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Expert/ }).click();
    await expect(page).toHaveURL(/\/step\/1\?level=expert/);
    await expect(page.locator("text=Step 1 of 7")).toBeVisible();
  });

  test("all 7 steps render without errors", async ({ page }) => {
    for (let step = 1; step <= 7; step++) {
      await page.goto(`/step/${step}?level=novice`);
      await expect(page.locator(`text=Step ${step} of 7`)).toBeVisible();
    }
  });

  test("nav bar shows correct skill badge for each level", async ({ page }) => {
    await page.goto("/step/1?level=novice");
    await expect(page.locator("text=🌱 Novice")).toBeVisible();

    await page.goto("/step/1?level=medium");
    await expect(page.locator("text=⚡ Medium")).toBeVisible();

    await page.goto("/step/1?level=expert");
    await expect(page.locator("text=🚀 Expert")).toBeVisible();
  });

  test("step 1 shows verify button and URL input", async ({ page }) => {
    await page.goto("/step/1?level=novice");
    await expect(page.locator("text=Your WordPress Site URL")).toBeVisible();
    await expect(page.locator("text=Verify Connection")).toBeVisible();
  });

  test("step 1 expert mode hides instructions", async ({ page }) => {
    await page.goto("/step/1?level=expert");
    // Expert should not show the instruction card
    await expect(page.locator("text=📋 Instructions")).not.toBeVisible();
    // But should show the input
    await expect(page.locator("text=Your WordPress Site URL")).toBeVisible();
  });

  test("back navigation works between steps", async ({ page }) => {
    await page.goto("/step/3?level=novice");
    await page.click("text=← Back to Step 2");
    await expect(page).toHaveURL(/\/step\/2\?level=novice/);
  });

  test("step 6 requires at least 3 URLs", async ({ page }) => {
    await page.goto("/step/6?level=novice");
    await expect(page.locator("text=Share your taste")).toBeVisible();
    // Continue button should be disabled with 0 URLs
    const continueBtn = page.locator("button:has-text('Save & Continue')");
    await expect(continueBtn).toBeDisabled();
  });

  test("step 7 shows summary cards", async ({ page }) => {
    await page.goto("/step/7?level=novice");
    await expect(page.getByText("WordPress", { exact: true })).toBeVisible();
    await expect(page.getByText("Sanity CMS", { exact: true })).toBeVisible();
    await expect(page.getByText("GitHub", { exact: true })).toBeVisible();
    await expect(page.getByText("🚀 Start Migration")).toBeVisible();
  });

  test("invalid step shows error", async ({ page }) => {
    await page.goto("/step/99?level=novice");
    await expect(page.locator("text=Step not found")).toBeVisible();
  });
});
