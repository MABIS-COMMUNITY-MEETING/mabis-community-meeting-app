"""Are the generated subsets actually valid, renderable fonts?"""
from fontTools.ttLib import TTFont

SRC = "public/fonts/gnu-freefont"
PAIRS = [("FreeMono", "FreeMono-subset"), ("FreeMonoBold", "FreeMonoBold-subset")]

SAMPLE = "The quick brown fox 0123456789 — → café ’ … •"

for original_name, subset_name in PAIRS:
    original = TTFont("%s/%s.woff2" % (SRC, original_name))
    subset = TTFont("%s/%s.woff2" % (SRC, subset_name))

    print("== %s ==" % subset_name)
    print("  flavor:", subset.flavor)
    print("  tables:", ",".join(sorted(subset.keys())))
    missing_core = [t for t in ("cmap", "head", "hhea", "hmtx", "maxp", "name", "OS/2", "post", "glyf", "loca") if t not in subset]
    print("  missing core tables:", missing_core or "none")
    print("  DSIG present (invalid after subsetting):", "DSIG" in subset)

    ocmap, scmap = original.getBestCmap(), subset.getBestCmap()
    missing = [c for c in SAMPLE if ord(c) not in scmap and ord(c) in ocmap]
    print("  sample chars missing from subset:", missing or "none")

    # metrics must be identical or text reflows
    print("  unitsPerEm  orig %d / subset %d" % (original["head"].unitsPerEm, subset["head"].unitsPerEm))
    print("  ascent/descent orig %d/%d  subset %d/%d" % (
        original["hhea"].ascent, original["hhea"].descent,
        subset["hhea"].ascent, subset["hhea"].descent))

    oglyphs, sglyphs = original.getGlyphSet(), subset.getGlyphSet()
    widths_differ = []
    for ch in SAMPLE:
        cp = ord(ch)
        if cp in ocmap and cp in scmap:
            ow = oglyphs[ocmap[cp]].width
            sw = sglyphs[scmap[cp]].width
            if ow != sw:
                widths_differ.append((ch, ow, sw))
    print("  advance widths differing:", widths_differ or "none")
    print()
