import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const stylesDir = fileURLToPath(new URL(".", import.meta.url));
const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");

const REQUIRED_LAYOUT_TOKENS = [
  "--gs-radius-sm",
  "--gs-radius-md",
  "--gs-control-height",
  "--gs-control-height-lg",
  "--gs-panel-padding",
  "--gs-panel-padding-lg",
  "--gs-gap-xs",
  "--gs-gap-sm",
  "--gs-gap-md",
  "--gs-gap-lg",
  "--gs-shell-width",
  "--gs-depth-panel",
  "--gs-depth-dialog",
  "--gs-disabled-opacity",
];

const REQUIRED_COLOR_TOKENS = [
  "--gs-page",
  "--gs-page-chrome",
  "--gs-surface",
  "--gs-surface-muted",
  "--gs-surface-raised",
  "--gs-text",
  "--gs-text-muted",
  "--gs-heading",
  "--gs-border",
  "--gs-border-subtle",
  "--gs-focus",
  "--gs-focus-shadow",
  "--gs-accent",
  "--gs-accent-hover",
  "--gs-accent-text",
  "--gs-accent-muted",
  "--gs-danger",
  "--gs-danger-muted",
  "--gs-warning",
  "--gs-warning-muted",
  "--gs-success",
  "--gs-success-muted",
];

function extractBlock(selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\n\\}`));

  if (!match) {
    throw new Error(`Missing CSS block for ${selector}`);
  }

  return match[1];
}

function extractTokens(selector: string) {
  const tokens = new Map<string, string>();
  const block = extractBlock(selector);
  const tokenPattern = /(--[\w-]+):\s*([^;]+);/g;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(block))) {
    tokens.set(match[1], match[2].trim());
  }

  return tokens;
}

describe("theme tokens", () => {
  it("keeps light and dark color roles defined", () => {
    for (const selector of [":root", '[data-theme="dark"]']) {
      const tokens = extractTokens(selector);

      for (const token of REQUIRED_COLOR_TOKENS) {
        expect(tokens.has(token), `${selector} ${token}`).toBe(true);
      }
    }
  });

  it("keeps light and dark layout tokens defined", () => {
    for (const selector of [":root", '[data-theme="dark"]']) {
      const tokens = extractTokens(selector);

      for (const token of REQUIRED_LAYOUT_TOKENS) {
        expect(tokens.has(token), `${selector} ${token}`).toBe(true);
      }
    }
  });
});

describe("CSS color hygiene", () => {
  it("keeps raw color literals inside token blocks", () => {
    const failures: string[] = [];
    const rawColorPattern = /#[0-9a-f]{3,8}\b|rgba?\(/i;
    let tokenBlockDepth = 0;

    css.split("\n").forEach((line, index) => {
      const opensTokenBlock = /^:root\s*\{/.test(line) || /^\[data-theme="dark"\]\s*\{/.test(line);

      if (opensTokenBlock) {
        tokenBlockDepth = 1;
      } else if (tokenBlockDepth > 0) {
        tokenBlockDepth += (line.match(/\{/g) ?? []).length;
      }

      if (tokenBlockDepth === 0 && rawColorPattern.test(line)) {
        failures.push(`${stylesDir}:${index + 1}: ${line.trim()}`);
      }

      if (tokenBlockDepth > 0) {
        tokenBlockDepth -= (line.match(/\}/g) ?? []).length;
      }
    });

    expect(failures).toEqual([]);
  });
});
