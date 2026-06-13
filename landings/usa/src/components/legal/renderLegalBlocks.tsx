import type { ReactNode } from "react";

export type LegalBlock =
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "label"; text: string }
  | { type: "callout"; text: string }
  | { type: "li"; text: string }
  | { type: "p"; text: string };

const TOC_MARKERS = new Set([
  "Содержание",
  "Разделы, требующие особого внимания",
  "Tabla de contenidos",
  "Secciones de especial atencion",
  "Table of contents",
  "Sections requiring special attention",
  "Sections of Most Attention",
]);

/**
 * Returns true when a line is mostly uppercase (legal disclaimers and notices).
 */
function isCalloutLine(text: string): boolean {
  if (text.length < 28) return false;
  const letters = text.replace(/[^A-Za-zА-Яа-яЁёÁÉÍÓÚÜáéíóúüÑñ]/g, "");
  if (letters.length < 20) return false;
  const upper = letters.replace(/[^A-ZÁÉÍÓÚÜА-ЯЁ]/g, "").length;
  return upper / letters.length >= 0.75;
}

/**
 * Detects short table-of-contents entries that duplicate full sections below.
 */
function isTocEntry(text: string): boolean {
  const match = text.match(/^(\d{1,2})\.\s+(.+)$/);
  if (!match || text.includes(".")) return false;
  return text.length < 72;
}

/**
 * Converts extracted docx paragraphs into renderable legal blocks.
 */
export function buildLegalBlocks(paragraphs: string[]): LegalBlock[] {
  const blocks: LegalBlock[] = [];
  let inToc = false;
  let listRun = false;

  for (let i = 0; i < paragraphs.length; i += 1) {
    const text = paragraphs[i].trim();
    if (!text) continue;

    if (TOC_MARKERS.has(text)) {
      inToc = true;
      continue;
    }

    if (inToc) {
      if (/^1\.\s/.test(text) && !isTocEntry(text)) {
        inToc = false;
      } else if (isTocEntry(text)) {
        continue;
      } else {
        inToc = false;
      }
    }

    if (/^(\d+\.\d+)\.\s/.test(text)) {
      listRun = false;
      blocks.push({ type: "h3", text });
      continue;
    }

    const section = text.match(/^(\d{1,2})\.\s+(.+)$/);
    if (section && !text.startsWith("2.1.") && !text.startsWith("2.2.")) {
      listRun = false;
      blocks.push({ type: "h2", text });
      continue;
    }

    if (isCalloutLine(text)) {
      listRun = false;
      blocks.push({ type: "callout", text });
      continue;
    }

    if (text.endsWith(":") && text.length < 90 && !text.includes("http")) {
      listRun = false;
      blocks.push({ type: "label", text });
      continue;
    }

    const isListItem =
      /^\((i{1,3}|iv|v|vi|vii|viii|ix|x)\)\s/i.test(text) ||
      /^(iOS|Android|macOS|Network Advertising Initiative|Digital Advertising Alliance):/.test(text) ||
      (/^[A-Za-zА-Яа-яЁё0-9][^.:]{0,90}\([^)]+\)$/.test(text) && listRun);

    if (isListItem) {
      listRun = true;
      blocks.push({ type: "li", text });
      continue;
    }

    listRun = false;
    blocks.push({ type: "p", text });
  }

  return blocks;
}

/**
 * Turns plain text into inline nodes with mailto and external links.
 */
export function linkifyText(text: string): ReactNode[] {
  const pattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|(https?:\/\/[^\s]+)/g;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const value = match[0];
    if (match[1]) {
      nodes.push(
        <a key={`${match.index}-mail`} href={`mailto:${value}`} style={{ color: "#F97316" }}>
          {value}
        </a>
      );
    } else {
      nodes.push(
        <a
          key={`${match.index}-url`}
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#F97316" }}
        >
          {value}
        </a>
      );
    }

    lastIndex = match.index + value.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length ? nodes : [text];
}
