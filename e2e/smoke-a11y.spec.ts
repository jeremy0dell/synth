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
  test("loads the Signal Field patch editor", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { exact: true, name: "Signal Field" })).toBeVisible();
    await expect(page.getByRole("radiogroup", { name: "Starter patch" })).toBeVisible();
    await expect(page.getByRole("radiogroup", { name: "Connection mode" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
    await expect(page.getByRole("button", { exact: true, name: "Trigger" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Kick From Atoms" })).toBeChecked();
    await expect(page.getByRole("region", { name: "Wire, trigger, listen" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Show guide" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "How to use Signal Field" })).toBeHidden();

    await page.getByRole("button", { name: "Show guide" }).click();
    await expect(page.getByRole("heading", { name: "How to use Signal Field" })).toBeVisible();
    await expect(page.getByText("First percussion recipe")).toBeVisible();

    await page.getByRole("button", { name: "Hide guide" }).click();
    await expect(page.getByRole("heading", { name: "How to use Signal Field" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Show guide" })).toBeVisible();
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

  test("makes connection mode keyboard operable", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("radio", { name: "Lab" }).focus();
    await expect(page.getByRole("radio", { name: "Lab" })).toBeFocused();

    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radio", { name: "Guided" })).toBeChecked();
  });

  test("keeps the core layout visible on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/demo");

    await expect(page.locator(".gs-topbar")).toBeVisible();
    await expect(page.locator(".gs-sidebar")).toBeVisible();
    await expect(page.getByRole("heading", { exact: true, name: "Signal Field" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
    await expect(page.getByRole("button", { exact: true, name: "Trigger" })).toBeVisible();
  });

  test("wires actual nodes together and plays the repaired patch", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("radio", { name: "Broken: Why No Sound?" }).click();
    await expect(page.getByTestId("status-graph")).toContainText("5 nodes / 3 wires");

    await page.getByTestId("port-env-controlOut").click();
    await expect(page.getByLabel("Patch JSON and reports")).toHaveValue(/Wire started at env\.controlOut/);

    await page.getByTestId("port-gain-gainIn").click();
    await expect(page.getByTestId("status-graph")).toContainText("5 nodes / 4 wires");
    await expect(page.getByLabel("Patch JSON and reports")).toHaveValue(/Connected env\.controlOut -> gain\.gainIn/);

    await page.getByRole("button", { name: "Remove selected wire" }).click();
    await expect(page.getByTestId("status-graph")).toContainText("5 nodes / 3 wires");
    await expect(page.getByLabel("Patch JSON and reports")).toHaveValue(/Removed wire/);

    await page.getByTestId("port-env-controlOut").click();
    await page.getByTestId("port-gain-gainIn").click();
    await expect(page.getByTestId("status-graph")).toContainText("5 nodes / 4 wires");

    await page.getByRole("button", { name: "Play" }).click();
    await expect
      .poll(async () => {
        const text = await page.getByTestId("status-peak").innerText();
        return Number(text.match(/[0-9]+\.[0-9]+/)?.[0] ?? 0);
      })
      .toBeGreaterThan(0.001);
  });
});
