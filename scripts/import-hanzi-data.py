"""Extract the pinned, offline twelve-book subset and default main-package book.

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
    curricula = json.loads((DEST / "curriculum.json").read_text())
    assert len(curricula) == 12
    assert {(entry["grade"], entry["semester"]) for entry in curricula} == {
        (grade, semester) for grade in range(1, 7) for semester in (1, 2)
    }
    assert len({entry["id"] for entry in curricula}) == 12
    for entry in curricula:
        characters = entry["characters"]
        assert len(characters) == len(set(characters)) == entry["characterCount"], entry["id"]
        assert hashlib.sha256(characters.encode()).hexdigest() == entry["charactersSha256"], entry["id"]
        assert all(entry[key] for key in ("name", "edition", "source"))
    characters = list(dict.fromkeys("".join(entry["characters"] for entry in curricula)))
    wanted = set(characters)
    data = {}
    license_bytes = None
    version = None
    # Read gzip once. Seeking separately for thousands of characters repeatedly
    # decompresses the archive and makes a full import unnecessarily expensive.
    with tarfile.open(archive_path, mode="r|gz") as archive:
        for member in archive:
            if member.name == "package/package.json":
                version = json.load(archive.extractfile(member))["version"]
            elif member.name == "package/ARPHICPL.TXT":
                license_bytes = archive.extractfile(member).read()
            character = member.name.removeprefix("package/").removesuffix(".json")
            if character not in wanted:
                continue
            entry = json.load(archive.extractfile(member))
            assert len(entry["strokes"]) == len(entry["medians"]) > 0
            assert all(len(median) >= 2 for median in entry["medians"])
            assert all(len(point) == 2 and all(isinstance(value, (int, float)) for value in point)
                       for median in entry["medians"] for point in median)
            data[character] = {key: entry[key] for key in ("strokes", "medians")}
    assert version == "2.0.1" and license_bytes
    assert set(data) == wanted, "Missing glyphs: " + "".join(wanted - set(data))
    data = {character: data[character] for character in characters}
    (DEST / "data.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n")
    default = next(entry for entry in curricula if entry["id"] == "g1-s1")
    subset = {character: data[character] for character in default["characters"]}
    (DEST / "default-data.json").write_text(json.dumps(subset, ensure_ascii=False, separators=(",", ":")) + "\n")
    (DEST / "ARPHICPL.TXT").write_bytes(license_bytes)
    print(f"Imported {len(data)} characters; {(DEST / 'data.json').stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
