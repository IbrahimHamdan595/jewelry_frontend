import { render } from "@testing-library/react";
import { LanguageProvider, useLang, type Lang } from "@/context/LanguageContext";

function Switch() {
  const { lang, setLang } = useLang();
  return <button onClick={() => setLang(lang === "ar" ? "en" : "ar")}>switch language</button>;
}

/**
 * Renders a page in a language, with a "switch language" button beside it —
 * what the admin shell's switcher does — so a test can change the language
 * while the page is on screen.
 */
export function renderWithSwitch(ui: React.ReactNode, lang: Lang) {
  return render(<LanguageProvider initialLang={lang}><Switch />{ui}</LanguageProvider>);
}
