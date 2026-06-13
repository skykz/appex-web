import policies from "@/content/legal-policies.json";

export type LegalLang = "es" | "ru" | "en";
export type LegalPolicyKey = keyof typeof policies.es;

const STORAGE_KEY = "appexLegalLang";

/** Languages that currently have policy content loaded from docx sources. */
export const AVAILABLE_LEGAL_LANGS: LegalLang[] = ["en", "es", "ru"];

export const LEGAL_LANG_LABELS: Record<LegalLang, string> = {
  es: "Español",
  ru: "Русский",
  en: "English",
};

/**
 * Returns true when English policy JSON has been added to the content bundle.
 */
export function isEnglishLegalAvailable(): boolean {
  return Boolean(policies.en?.privacy?.length);
}

/**
 * Picks the best legal document language from URL, saved preference, or browser locale.
 */
export function resolveLegalLang(requested?: string | null): LegalLang {
  if (requested === "en" || requested === "es" || requested === "ru") return requested;

  if (typeof window !== "undefined") {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "es" || saved === "ru") return saved;

    const nav = window.navigator.language?.toLowerCase() ?? "";
    if (nav.startsWith("ru")) return "ru";
    if (nav.startsWith("es")) return "es";
  }

  return "en";
}

/**
 * Persists the user's legal document language for future policy links.
 */
export function saveLegalLang(lang: LegalLang): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, lang);
}

/**
 * Builds a policy route href with the language query param for new-tab links.
 */
export function legalPolicyHref(path: string, lang?: LegalLang): string {
  const resolved = lang ?? resolveLegalLang();
  return `${path}?lang=${resolved}`;
}

/**
 * Reads policy paragraphs for the requested language with fallback to Spanish.
 */
export function getLegalParagraphs(policy: LegalPolicyKey, lang: LegalLang): string[] {
  const bundle = policies[lang as keyof typeof policies];
  if (bundle?.[policy]?.length) return bundle[policy];
  if (policies.en?.[policy]?.length) return policies.en[policy];
  if (policies.es?.[policy]?.length) return policies.es[policy];
  return policies.ru[policy];
}

/**
 * Finds the "last updated" line in a policy regardless of language.
 */
export function findUpdatedLine(paragraphs: string[]): string | undefined {
  return [...paragraphs]
    .reverse()
    .find(
      (line) =>
        line.includes("Дата последнего обновления") ||
        line.includes("Fecha de ultima actualizacion") ||
        line.includes("Date of Last Revision") ||
        line.includes("Last updated")
    );
}

/**
 * Copyright notice shown at the bottom of legal pages.
 */
export function legalCopyrightNotice(lang: LegalLang): string {
  if (lang === "ru") return "© 2026 Appex Inc. Все права защищены.";
  if (lang === "en") return "© 2026 Appex Inc. All rights reserved.";
  return "© 2026 Appex Inc. Todos los derechos reservados.";
}
