// @vitest-environment node
import { describe, it, expect } from "vitest";
import config from "../../.eslintrc.js";

type Level = "off" | "warn" | "error";
type Entry = Level | [Level, ...unknown[]];
const rules = config.rules as unknown as Record<string, Entry>;
const levelOf = (rule: string): Level => { const entry = rules[rule]; return Array.isArray(entry) ? entry[0] : entry; };
const optionsOf = (rule: string): unknown[] => { const entry = rules[rule]; return Array.isArray(entry) ? entry.slice(1) : []; };
// What the plugin ships, to check that nothing was dropped on the way to "error".
// (require: the plugin is CommonJS and has no type declarations.)
const shipped = require("eslint-plugin-jsx-a11y").configs.recommended.rules as Record<string, Entry>;
const shippedOptions = (rule: string) => { const entry = shipped[rule]; return Array.isArray(entry) ? entry.slice(1) : []; };

// NEX-64 took hardcoded strings and unlabelled controls to zero. These are the
// rules that got it there. As warnings they only fail CI through the
// --max-warnings budget, which someone fixing an unrelated warning silently
// frees up for a regression; as errors they fail lint whatever the budget is.
const PROMOTED = [
  "i18next/no-literal-string",
  "jsx-a11y/label-has-associated-control",
  "jsx-a11y/control-has-associated-label",
  "jsx-a11y/click-events-have-key-events",
  "jsx-a11y/no-static-element-interactions",
];

describe("eslint quality gate", () => {
  it.each(PROMOTED)("%s is an error", (rule) => {
    expect(levelOf(rule)).toBe("error");
  });

  it.each(PROMOTED.filter((rule) => rule.startsWith("jsx-a11y/")))("%s keeps the options the plugin ships", (rule) => {
    expect(optionsOf(rule)).toEqual(shippedOptions(rule));
  });

  it("the literal-string rule keeps its scope and its exemptions", () => {
    const [options] = optionsOf("i18next/no-literal-string") as [{ mode: string; words: { exclude: string[] } }];
    expect(options.mode).toBe("jsx-text-only");
    // The plugin's own defaults (numbers, symbols, ALL-CAPS constants…) and the shop's units and codes.
    expect(options.words.exclude.length).toBeGreaterThan(1);
    const units = options.words.exclude[options.words.exclude.length - 1];
    for (const word of ["USD", "LBP", "K21", "24K", "g", "QR", "SKU"]) expect(new RegExp(units).test(word), word).toBe(true);
    expect(new RegExp(units).test("Save")).toBe(false);
  });

  it("tests, the dictionaries and global-error stay exempt from the literal-string rule", () => {
    const exempt = (config.overrides as unknown as { files: string[]; rules: Record<string, Entry> }[])
      .filter((o) => o.rules["i18next/no-literal-string"] === "off")
      .flatMap((o) => o.files);
    for (const pattern of ["**/*.test.ts", "**/*.test.tsx", "src/test/**", "src/i18n/**", "src/app/global-error.tsx"]) expect(exempt).toContain(pattern);
  });

  it("the rest of the a11y set is unchanged: warnings, with the deprecated label rule off", () => {
    for (const rule of ["jsx-a11y/alt-text", "jsx-a11y/anchor-is-valid", "jsx-a11y/no-autofocus", "jsx-a11y/role-has-required-aria-props"]) {
      expect(levelOf(rule), rule).toBe("warn");
    }
    expect(levelOf("jsx-a11y/label-has-for")).toBe("off");
    const errors = Object.keys(rules).filter((rule) => levelOf(rule) === "error").sort();
    expect(errors).toEqual([...PROMOTED].sort());
  });
});
