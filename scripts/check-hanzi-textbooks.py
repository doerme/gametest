"""Verify the eleven added curricula against their pinned textbook PDFs.

Usage: python3 scripts/check-hanzi-textbooks.py /path/to/textbook-pdfs
Requires pypdf. PDF filenames are the names in each curriculum's source URL.
"""
import hashlib
import json
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlparse

from pypdf import PdfReader


def main():
    root = Path(__file__).resolve().parents[1]
    curricula = json.loads((root / "src/hanzi/curriculum.json").read_text())
    directory = Path(sys.argv[1])
    for entry in curricula:
        if "textbookSha256" not in entry:
            continue
        path = directory / unquote(Path(urlparse(entry["source"]).path).name)
        assert hashlib.sha256(path.read_bytes()).hexdigest() == entry["textbookSha256"], entry["id"]
        first, last = entry["verifiedPdfPages"]
        reader = PdfReader(path)
        text = "\n".join(reader.pages[index - 1].extract_text() for index in range(first, last + 1))
        end = re.search(r"[（(]\s*共\s*\d+\s*个\s*字\s*[）)]", text)
        assert end, entry["id"]
        # Some PDFs put the heading after the first page's body in reading
        # order. Remove the heading in place, retaining the whole page's text.
        text = re.sub(r"写\s*字\s*表|课文|识字|统编版", "", text[:end.start()])
        characters = "".join(re.findall(r"[\u3400-\u9fff]", text))
        assert characters == entry["characters"], entry["id"]
        print(f"{entry['id']}: {len(characters)} characters verified (PDF pages {first}-{last})")


if __name__ == "__main__":
    main()
