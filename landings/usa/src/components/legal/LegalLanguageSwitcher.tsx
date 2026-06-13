import { Link, useLocation } from "react-router-dom";
import {
  AVAILABLE_LEGAL_LANGS,
  LEGAL_LANG_LABELS,
  saveLegalLang,
  type LegalLang,
} from "@/lib/legal-lang";

type LegalLanguageSwitcherProps = {
  lang: LegalLang;
};

/**
 * Lets users switch between available legal document languages on policy pages.
 */
export function LegalLanguageSwitcher({ lang }: LegalLanguageSwitcherProps) {
  const location = useLocation();
  const basePath = location.pathname;

  const setLang = (next: LegalLang) => {
    saveLegalLang(next);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <span className="text-[13px] font-medium" style={{ color: "#6B7280" }}>
        Language:
      </span>
      {AVAILABLE_LEGAL_LANGS.map((code) => (
        <Link
          key={code}
          to={`${basePath}?lang=${code}`}
          onClick={() => setLang(code)}
          className="text-[13px] font-semibold rounded-full px-3 py-1 no-underline transition-colors"
          style={{
            background: lang === code ? "#FFF7ED" : "#F3F4F6",
            color: lang === code ? "#EA580C" : "#374151",
            border: lang === code ? "1px solid #FDBA74" : "1px solid transparent",
          }}
        >
          {LEGAL_LANG_LABELS[code]}
        </Link>
      ))}
    </div>
  );
}
