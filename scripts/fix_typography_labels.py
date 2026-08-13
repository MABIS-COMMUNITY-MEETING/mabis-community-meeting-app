from pathlib import Path
import re

for file_path in Path("src").rglob("*"):
    if file_path.suffix not in {".js", ".jsx", ".ts", ".tsx", ".css"}:
        continue
    text = file_path.read_text()
    updated = re.sub(r"\s*／+\s*", " ", text)
    if updated != text:
        file_path.write_text(updated)

print("Removed font-dependent full-width slash glyphs from UI source")
