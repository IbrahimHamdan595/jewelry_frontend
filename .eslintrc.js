/**
 * Frontend quality gate (NEX-57).
 *
 * Three rule families:
 *   - next/core-web-vitals   errors, as shipped
 *   - jsx-a11y recommended   warnings, except the rules promoted below
 *   - i18next/no-literal-string   error
 *
 * NEX-64 took hardcoded JSX strings and unlabelled controls from several
 * hundred findings to zero. The rules that got there (PROMOTED) are errors
 * now: a new hardcoded string or an unlabelled input fails lint outright,
 * whatever room the warning budget happens to have.
 *
 * Everything else is still a warning, and warnings are not free: `npm run
 * lint` runs with --max-warnings pinned to the current count, so it can only
 * go down. Ratchet the number in package.json as warnings are fixed; never
 * up. What remains (11) is react-hooks/exhaustive-deps and
 * @next/next/no-img-element.
 */
const a11yRecommended = require("eslint-plugin-jsx-a11y").configs.recommended.rules;
// The plugin shallow-merges options, so passing `words` would drop its own
// defaults (numbers, symbols, ALL-CAPS constants, entities, emoji). Keep them.
const i18nDefaults = require("eslint-plugin-i18next/lib/options/defaults");
// At zero findings, and kept there: errors, with the plugin's own options.
const PROMOTED = new Set([
  "jsx-a11y/label-has-associated-control",
  "jsx-a11y/control-has-associated-label",
  "jsx-a11y/click-events-have-key-events",
  "jsx-a11y/no-static-element-interactions",
]);
const a11yRules = Object.fromEntries(
  Object.entries(a11yRecommended).map(([rule, level]) => {
    const severity = PROMOTED.has(rule) ? "error" : "warn";
    return [rule, Array.isArray(level) ? [severity, ...level.slice(1)] : severity];
  }),
);

module.exports = {
  root: true,
  extends: ["next/core-web-vitals", "plugin:jsx-a11y/recommended"],
  plugins: ["jsx-a11y", "i18next"],
  ignorePatterns: [".next/", "node_modules/", "next-env.d.ts"],
  rules: {
    ...a11yRules,
    // Deprecated twin of label-has-associated-control; keeping both would
    // count every unlabelled input twice.
    "jsx-a11y/label-has-for": "off",
    // Only JSX text nodes: attributes like className/href/data-testid are
    // never user-facing, and flagging them would bury the real findings.
    "i18next/no-literal-string": [
      "error",
      {
        mode: "jsx-text-only",
        // Symbols, numbers, units and codes are not translatable copy.
        words: {
          exclude: [
            ...i18nDefaults.words.exclude,
            // Units, currencies and codes that appear as bare JSX text.
            "^(USD|LBP|K18|K21|K22|K24|24K|22K|21K|18K|g|kg|Excel|QR|SKU)$",
          ],
        },
      },
    ],
  },
  overrides: [
    {
      // Test files and translation tables are literal strings by nature.
      files: ["**/*.test.ts", "**/*.test.tsx", "src/test/**", "src/i18n/**", "vitest.config.ts"],
      rules: { "i18next/no-literal-string": "off", "jsx-a11y/no-autofocus": "off" },
    },
    {
      // global-error.tsx replaces the root layout: no LanguageProvider, so
      // its copy is inline in both languages on purpose.
      files: ["src/app/global-error.tsx"],
      rules: { "i18next/no-literal-string": "off" },
    },
  ],
};
