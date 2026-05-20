import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { THEME_STORAGE_KEY } from "../src/lib/theme";

async function setStoredThemePreference(page: Page, preference: "system" | "light" | "dark") {
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    { key: THEME_STORAGE_KEY, value: preference },
  );
}

async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

test.describe("public demo smoke and accessibility", () => {
  test("loads the demo screen", async ({ page }) => {
    await page.goto("/demo");

    await expect(page.getByRole("heading", { name: "Example items" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Demo item" })).toBeVisible();
    await expect(page.getByRole("radiogroup", { name: "Theme preference" })).toBeVisible();
  });

  test("renders light mode without axe violations", async ({ page }) => {
    await setStoredThemePreference(page, "light");
    await page.goto("/demo");

    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expectNoA11yViolations(page);
  });

  test("renders dark mode without axe violations", async ({ page }) => {
    await setStoredThemePreference(page, "dark");
    await page.goto("/demo");

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expectNoA11yViolations(page);
  });

  test("makes the theme control keyboard operable", async ({ page }) => {
    await page.goto("/demo");

    await page.getByRole("radio", { name: "System" }).focus();
    await expect(page.getByRole("radio", { name: "System" })).toBeFocused();

    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radio", { name: "Light" })).toBeChecked();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radio", { name: "Dark" })).toBeChecked();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("keeps the core layout visible on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/demo");

    await expect(page.locator(".gs-topbar")).toBeVisible();
    await expect(page.locator(".gs-sidebar")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Example items" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add demo item" })).toBeVisible();
  });
});
