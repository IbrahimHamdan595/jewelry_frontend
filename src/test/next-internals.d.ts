// Minimal typing for Next's bundled path-to-regexp, used only by the
// middleware matcher test.
declare module "next/dist/compiled/path-to-regexp" {
  export function pathToRegexp(path: string): RegExp;
}
