"""Which codepoints outside Latin-1 does the shipped UI actually contain?

Scans the app source (not node_modules) so the font subset can be defined from
what is rendered rather than guessed at.
"""
import os
import unicodedata
from collections import Counter

ROOTS = ["solid", "src/lib", "src/styles", "src/index.css", "src/pages", "src/components"]
EXTS = (".js", ".jsx", ".css", ".ts", ".tsx", ".html")
SKIP_FILES = {"japanese-ui-translations.js"}  # CJK, served by the CJK font

counts = Counter()
where = {}

def scan(path):
    if os.path.basename(path) in SKIP_FILES:
        return
    try:
        text = open(path, encoding="utf-8").read()
    except (UnicodeDecodeError, OSError):
        return
    for ch in text:
        cp = ord(ch)
        if cp < 0x100:
            continue
        counts[cp] += 1
        where.setdefault(cp, path)

for root in ROOTS:
    if os.path.isfile(root):
        scan(root)
        continue
    for dirpath, _dirs, files in os.walk(root):
        for name in files:
            if name.endswith(EXTS):
                scan(os.path.join(dirpath, name))

cjk = [cp for cp in counts if 0x2E80 <= cp <= 0x9FFF or 0x3000 <= cp <= 0x30FF or 0xFF00 <= cp <= 0xFFEF]
other = sorted(cp for cp in counts if cp not in set(cjk))

print("non-Latin-1 codepoints in app source: %d distinct (%d CJK, %d other)"
      % (len(counts), len(cjk), len(other)))
print("\nNON-CJK codepoints outside Latin-1 — these must be in the critical subset:\n")
for cp in other:
    try:
        name = unicodedata.name(chr(cp))
    except ValueError:
        name = "?"
    print("  U+%04X  %-3s x%-5d %-45s %s"
          % (cp, chr(cp), counts[cp], name, os.path.relpath(where[cp])))
