// Minimal typing for Next's bundled path-to-regexp, used only by the
// middleware matcher tests.
declare module "next/dist/compiled/path-to-regexp" {
  export function pathToRegexp(path: string): RegExp;
  export function parse(path: string): unknown[];
  export function tokensToRegexp(tokens: unknown[]): RegExp;
}
