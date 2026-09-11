import { describe, it, expect } from "vitest";
import { LANG_COOKIE, parseLang, dirFor, localeFor } from "@/lib/lang-cookie";

describe("language cookie helpers", () => {
  it("names the cookie", () => expect(LANG_COOKIE).toBe("mz_lang"));

  it("parses only the two supported languages and falls back to English", () => {
    expect(parseLang("ar")).toBe("ar");
    expect(parseLang("en")).toBe("en");
    for (const bad of ["fr", "", undefined, "AR", "ar-LB"]) expect(parseLang(bad), String(bad)).toBe("en");
  });

  it("derives direction and formatting locale", () => {
    expect(dirFor("ar")).toBe("rtl");
    expect(dirFor("en")).toBe("ltr");
    expect(localeFor("ar")).toBe("ar-LB-u-nu-latn"); // Arabic month names, Western digits (Lebanese convention)
    expect(localeFor("en")).toBe("en-GB");
  });
});
