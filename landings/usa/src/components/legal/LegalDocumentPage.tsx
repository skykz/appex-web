import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { buildLegalBlocks, linkifyText } from "./renderLegalBlocks";
import { LegalLanguageSwitcher } from "./LegalLanguageSwitcher";
import {
  findUpdatedLine,
  getLegalParagraphs,
  legalCopyrightNotice,
  resolveLegalLang,
  saveLegalLang,
  type LegalLang,
  type LegalPolicyKey,
} from "@/lib/legal-lang";

type LegalDocumentPageProps = {
  policy: LegalPolicyKey;
  /** Optional English UI label shown above the localized document title. */
  titleEn?: string;
};

/**
 * Renders a full legal policy page from extracted docx content in ES/RU (EN when added).
 */
export function LegalDocumentPage({ policy, titleEn }: LegalDocumentPageProps) {
  const [searchParams] = useSearchParams();
  const lang = resolveLegalLang(searchParams.get("lang"));

  useEffect(() => {
    saveLegalLang(lang);
  }, [lang]);

  const paragraphs = getLegalParagraphs(policy, lang);
  const documentTitle = paragraphs[0] ?? titleEn ?? policy;
  const updatedLine = findUpdatedLine(paragraphs);
  const bodyParagraphs = paragraphs.slice(1).filter((line) => !line.startsWith("© 2026"));
  const blocks = buildLegalBlocks(bodyParagraphs);

  return (
    <div className="min-h-screen" style={{ background: "#fff" }}>
      <div className="mx-auto px-5 py-12" style={{ maxWidth: 720 }}>
        <a href="/" className="inline-flex items-center gap-1 mb-8 font-extrabold text-[20px] no-underline">
          <span style={{ color: "#111" }}>App</span>
          <span style={{ color: "#F97316" }}>ex</span>
        </a>

        <LegalLanguageSwitcher lang={lang} />

        {titleEn && titleEn !== documentTitle ? (
          <p className="text-[13px] font-semibold uppercase tracking-wide mb-2" style={{ color: "#9CA3AF" }}>
            {titleEn}
          </p>
        ) : null}

        <h1 className="text-[32px] font-extrabold mb-2" style={{ color: "#111" }}>
          {documentTitle}
        </h1>

        {updatedLine ? (
          <p className="text-[14px] mb-8" style={{ color: "#6B7280" }}>
            {updatedLine}
          </p>
        ) : null}

        <div className="space-y-5 text-[15px] leading-relaxed" style={{ color: "#374151" }}>
          {blocks.map((block, index) => {
            if (block.type === "h2") {
              return (
                <h2 key={index} className="text-[20px] font-bold pt-2" style={{ color: "#111" }}>
                  {block.text}
                </h2>
              );
            }

            if (block.type === "h3") {
              return (
                <h3 key={index} className="text-[17px] font-semibold pt-1" style={{ color: "#111" }}>
                  {block.text}
                </h3>
              );
            }

            if (block.type === "label") {
              return (
                <p key={index} className="font-semibold" style={{ color: "#111" }}>
                  {linkifyText(block.text)}
                </p>
              );
            }

            if (block.type === "callout") {
              return (
                <div
                  key={index}
                  className="rounded-xl px-4 py-3 text-[14px] font-medium"
                  style={{ background: "#FFF7ED", color: "#7C2D12" }}
                >
                  {linkifyText(block.text)}
                </div>
              );
            }

            if (block.type === "li") {
              return (
                <li key={index} className="ml-5 list-disc">
                  {linkifyText(block.text)}
                </li>
              );
            }

            return <p key={index}>{linkifyText(block.text)}</p>;
          })}
        </div>

        <p className="text-[13px] mt-10" style={{ color: "#9CA3AF" }}>
          {legalCopyrightNotice(lang)}
        </p>
      </div>
    </div>
  );
}
