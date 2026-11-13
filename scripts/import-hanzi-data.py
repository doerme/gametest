"""Extract the pinned, offline 100-character subset. No network access at runtime.

Usage: python3 scripts/import-hanzi-data.py /path/to/hanzi-writer-data-2.0.1.tgz
Archive: https://registry.npmjs.org/hanzi-writer-data/-/hanzi-writer-data-2.0.1.tgz
"""
import hashlib
import json
from pathlib import Path
import sys
import tarfile

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "src" / "hanzi"
SHA256 = "72baf3d82b114e60d6e40ea05f24d2262a05cd39d544e2f322ba2fceb7beff15"


def main():
    archive_path = Path(sys.argv[1])
    if hashlib.sha256(archive_path.read_bytes()).hexdigest() != SHA256:
        raise ValueError("Expected the original hanzi-writer-data@2.0.1 npm archive")
    curriculum = json.loads((DEST / "curriculum.json").read_text())
    characters = curriculum["characters"]
    assert len(characters) == len(set(characters)) == 100
    data = {}
    with tarfile.open(archive_path) as archive:
        package = json.load(archive.extractfile("package/package.json"))
        assert package["version"] == "2.0.1"
        for character in characters:
            entry = json.load(archive.extractfile(f"package/{character}.json"))
            assert len(entry["strokes"]) == len(entry["medians"]) > 0
            assert all(len(median) >= 2 for median in entry["medians"])
            data[character] = {key: entry[key] for key in ("strokes", "medians")}
        license_bytes = archive.extractfile("package/ARPHICPL.TXT").read()
    (DEST / "data.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n")
    (DEST / "ARPHICPL.TXT").write_bytes(license_bytes)
    print(f"Imported {len(data)} characters; {(DEST / 'data.json').stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
