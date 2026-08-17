"""What each block in CRITICAL_RANGES costs, so the generosity is a measured
choice rather than a guess."""
import os
import tempfile
from fontTools import subset
from fontTools.ttLib import TTFont

SRC = "public/fonts/gnu-freefont/FreeMono.woff2"

BASE = [(0x0000, 0x00FF), (0x0131, 0x0131), (0x0152, 0x0153),
        (0x02BB, 0x02BC), (0x02C6, 0x02C6), (0x02DA, 0x02DA), (0x02DC, 0x02DC),
        (0xFEFF, 0xFEFF), (0xFFFD, 0xFFFD)]

EXTRAS = [
    ("combining 0300-036F", [(0x0300, 0x036F)]),
    ("Greek 0370-03FF", [(0x0370, 0x03FF)]),
    ("punctuation 2000-206F", [(0x2000, 0x206F)]),
    ("super/sub 2070-209F", [(0x2070, 0x209F)]),
    ("currency 20A0-20CF", [(0x20A0, 0x20CF)]),
    ("letterlike 2100-214F", [(0x2100, 0x214F)]),
    ("arrows 2190-21FF", [(0x2190, 0x21FF)]),
    ("math 2200-22FF", [(0x2200, 0x22FF)]),
    ("box drawing 2500-257F", [(0x2500, 0x257F)]),
    ("shapes 25A0-25FF", [(0x25A0, 0x25FF)]),
    ("dingbats 2700-27BF", [(0x2700, 0x27BF)]),
]


def build(ranges):
    cps = set()
    for a, b in ranges:
        cps.update(range(a, b + 1))
    font = TTFont(SRC)
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    options.drop_tables = []
    options.notdef_outline = True
    s = subset.Subsetter(options=options)
    s.populate(unicodes=sorted(cps))
    s.subset(font)
    font.flavor = "woff2"
    out = tempfile.NamedTemporaryFile(suffix=".woff2", delete=False)
    font.save(out.name)
    size = os.path.getsize(out.name)
    os.unlink(out.name)
    return size


base_size = build(BASE)
print("Latin-1 core only: %d bytes" % base_size)
running = list(BASE)
for label, ranges in EXTRAS:
    only = build(BASE + ranges)
    print("  + %-24s %6d bytes  (+%d over core)" % (label, only, only - base_size))
    running += ranges
print("\nall blocks together: %d bytes" % build(running))
