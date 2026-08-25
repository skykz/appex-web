from __future__ import annotations

import hashlib
import re
import shutil
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

LESSONS = [
    ("Prologue · Setup", "00_prologue_setup.docx"),
    ("DAY 1", "01_day_1_documents.docx"),
    ("DAY 2", "02_day_2_presentations.docx"),
    ("DAY 3", "03_day_3_analytics.docx"),
    ("DAY 4", "04_day_4_dashboards.docx"),
    ("DAY 5", "05_day_5_research.docx"),
    ("DAY 6", "06_day_6_automation.docx"),
    ("DAY 7", "07_day_7_ship_a_product.docx"),
]


def text_of(element: ET.Element) -> str:
    return "".join(node.text or "" for node in element.iter(W + "t"))


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest().upper()


def rewrite_document(source: Path, output: Path, new_document_xml: bytes) -> None:
    with zipfile.ZipFile(source, "r") as zin, zipfile.ZipFile(output, "w") as zout:
        for item in zin.infolist():
            data = new_document_xml if item.filename == "word/document.xml" else zin.read(item.filename)
            zout.writestr(item, data)


def main() -> None:
    source = Path(sys.argv[1]).resolve()
    output_dir = Path(sys.argv[2]).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    expected_hash = "1FB55EBD447BB67D26C2D289E68536AAC4B83F7CD18D9EC4FC7BD5993AAC9CF7"
    if sha256(source) != expected_hash:
        raise SystemExit("Source hash differs from the distilled reference; refusing to split.")

    with zipfile.ZipFile(source, "r") as z:
        original_xml = z.read("word/document.xml")
        baseline_parts = {n: z.read(n) for n in z.namelist() if n != "word/document.xml"}

    root = ET.fromstring(original_xml)
    body = root.find(W + "body")
    if body is None:
        raise SystemExit("Document body not found")
    children = list(body)
    sect_pr = next((e for e in children if e.tag == W + "sectPr"), None)

    boundaries: list[int] = []
    for label, _ in LESSONS:
        hits = [i for i, element in enumerate(children) if text_of(element).strip() == label]
        if len(hits) != 1:
            raise SystemExit(f"Expected one boundary {label!r}, found {len(hits)}")
        boundaries.append(hits[0])

    for lesson_index, ((label, filename), start) in enumerate(zip(LESSONS, boundaries)):
        end = boundaries[lesson_index + 1] if lesson_index + 1 < len(boundaries) else len(children)
        selected = [e for e in children[start:end] if e.tag != W + "sectPr"]

        out_root = ET.fromstring(original_xml)
        out_body = out_root.find(W + "body")
        assert out_body is not None
        for element in list(out_body):
            out_body.remove(element)
        for element in selected:
            out_body.append(ET.fromstring(ET.tostring(element, encoding="utf-8")))
        if sect_pr is not None:
            out_body.append(ET.fromstring(ET.tostring(sect_pr, encoding="utf-8")))

        new_xml = ET.tostring(out_root, encoding="utf-8", xml_declaration=True)
        output = output_dir / filename
        rewrite_document(source, output, new_xml)

        with zipfile.ZipFile(output, "r") as z:
            for part_name, expected in baseline_parts.items():
                if z.read(part_name) != expected:
                    raise SystemExit(f"Preserve-only part changed in {filename}: {part_name}")
            actual_text = text_of(ET.fromstring(z.read("word/document.xml")))
        boundary_count = sum(1 for marker, _ in LESSONS if marker in actual_text)
        if boundary_count != 1 or label not in actual_text:
            raise SystemExit(f"Boundary validation failed for {filename}")
        print(f"created {output.name}: {len(selected)} body elements")

    if sha256(source) != expected_hash:
        raise SystemExit("Reference file changed during processing")


if __name__ == "__main__":
    main()
