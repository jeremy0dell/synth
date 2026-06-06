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

test.describe("synth workbench smoke and accessibility", () => {
  test("loads the primitive composer", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Kick" })).toBeVisible();
    await expect(page.getByRole("radiogroup", { name: "Voice" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Rendered waveform" })).toBeVisible();
  });

  test("renders light mode without axe violations", async ({ page }) => {
    await setStoredThemePreference(page, "light");
    await page.goto("/");

    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expectNoA11yViolations(page);
  });

  test("renders dark mode without axe violations", async ({ page }) => {
    await setStoredThemePreference(page, "dark");
    await page.goto("/");

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expectNoA11yViolations(page);
  });

  test("makes the voice selector keyboard operable", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("radio", { name: "Kick" }).focus();
    await expect(page.getByRole("radio", { name: "Kick" })).toBeFocused();

    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radio", { name: "Snare" })).toBeChecked();
    await expect(page.getByRole("heading", { name: "Snare" })).toBeVisible();
  });

  test("keeps the core layout visible on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/demo");

    await expect(page.locator(".gs-topbar")).toBeVisible();
    await expect(page.locator(".gs-sidebar")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Kick" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
  });
});
