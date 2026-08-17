from fontTools.ttLib import TTFont
from collections import Counter

BLOCKS = [
    (0x0100, "0000 Latin-1"),
    (0x0250, "0100 Latin Ext"),
    (0x0300, "0250 IPA/modifier"),
    (0x0370, "0300 combining"),
    (0x0400, "0370 Greek"),
    (0x0530, "0400 Cyrillic"),
    (0x0590, "0530 Armenian"),
    (0x0600, "0590 Hebrew"),
    (0x0700, "0600 Arabic"),
    (0x10A0, "0700 other scripts"),
    (0x1100, "10A0 Georgian"),
    (0x2000, "1100 misc"),
    (0x2200, "2000 punctuation/symbols"),
    (0x2300, "2200 math"),
    (0x3000, "2300 technical/shapes"),
]


def block(cp):
    for limit, label in BLOCKS:
        if cp < limit:
            return label
    return "3000+ CJK/high"


for name in ["FreeMono", "FreeMonoBold"]:
    font = TTFont("public/fonts/gnu-freefont/%s.woff2" % name)
    cmap = font.getBestCmap()
    print("%s: %d mapped codepoints, %d glyphs" % (name, len(cmap), font["maxp"].numGlyphs))
    for label, count in sorted(Counter(block(cp) for cp in cmap).items()):
        print("    %6d  %s" % (count, label))
