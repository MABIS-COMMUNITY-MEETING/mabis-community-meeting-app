"""Split the two boot-critical GNU FreeMono faces into a small first-paint
subset and a rest-of-Unicode companion.

WHY

FreeMono.woff2 (185 KiB) and FreeMonoBold.woff2 (102 KiB) are `font-display:
block` and preloaded, so 287 KiB has to arrive before any text is painted —
more than three times the app's entire gzipped JS and CSS. They are that big
because GNU FreeMono is pan-Unicode: 4160 codepoints covering Greek, Cyrillic,
Hebrew, Arabic, Armenian, Georgian, CJK punctuation and 955 technical symbols.
A scan of every .js/.jsx/.css file in solid/ and src/ finds exactly 30
non-CJK codepoints outside Latin-1 in the entire UI.

WHAT THIS DOES

Emits, per face, two woff2 files whose glyph sets partition the original:

  *-subset.woff2  the codepoints first paint can need (CRITICAL_RANGES below)
  *-rest.woff2    everything else in the font

index.css declares both against the same family. The rest face is declared
FIRST with a broad U+0100-10FFFF range and the subset SECOND with its exact
ranges; CSS font matching takes the LAST matching @font-face, so a character in
both ranges resolves to the small file, and the big one is fetched only when a
character that only it covers actually appears on the page. Coverage is
therefore unchanged — no glyph is lost, nothing falls back to a different
typeface — while the preload shrinks to the subset.

Codepoints outside both (Thai, CJK) were already handled by other families in
the stack and still are.

REGENERATING

Needs fonttools, which is not a repo dependency because this runs once per
font change, not per build:

    pip install fonttools brotli
    python3 scripts/build-font-subsets.py

It rewrites public/fonts/gnu-freefont/*-subset.woff2 and *-rest.woff2 and the
codepoint manifest that check-font-subset.mjs asserts against. The source
FreeMono.woff2 / FreeMonoBold.woff2 are left in place: the other faces in the
family still reference them and they are the input to this script.
"""
import json
import os
from fontTools import subset
from fontTools.ttLib import TTFont

SOURCE_DIR = "public/fonts/gnu-freefont"
MANIFEST = os.path.join(SOURCE_DIR, "subset-manifest.json")

FACES = ["FreeMono", "FreeMonoBold"]

# Every range first paint can need. Derived from a scan of the app source
# (.perfprobe/scan-chars.py), then widened to whole blocks so that adding one
# more arrow or check mark to the UI does not silently pull the 185 KiB file
# onto the critical path. check-font-subset.mjs fails the build if a codepoint
# in the source escapes this set.
CRITICAL_RANGES = [
    (0x0000, 0x00FF),  # Latin-1: the entire UI, and accented names
    (0x0131, 0x0131),  # dotless i
    (0x0152, 0x0153),  # OE ligatures
    (0x02BB, 0x02BC),
    (0x02C6, 0x02C6),
    (0x02DA, 0x02DA),
    (0x02DC, 0x02DC),
    (0x0300, 0x036F),  # combining marks, so accents cannot break
    (0x0370, 0x03FF),  # Greek: physics labels (zeta, omega, tau, sigma, pi)
    (0x2000, 0x206F),  # general punctuation: en/em dash, curly quotes, bullet, ellipsis
    (0x2070, 0x209F),  # superscripts and subscripts
    (0x20A0, 0x20CF),  # currency
    (0x2100, 0x214F),  # letterlike symbols
    (0x2190, 0x21FF),  # arrows
    (0x2200, 0x22FF),  # mathematical operators
    (0x2500, 0x257F),  # box drawing: the terminal-style rules
    (0x25A0, 0x25FF),  # geometric shapes
    (0x2700, 0x27BF),  # dingbats: check and ballot marks
    (0xFEFF, 0xFEFF),
    (0xFFFD, 0xFFFD),
]


def critical_codepoints():
    out = set()
    for start, end in CRITICAL_RANGES:
        out.update(range(start, end + 1))
    return out


def write_subset(source, codepoints, destination):
    font = TTFont(source)
    options = subset.Options()
    options.flavor = "woff2"
    # Kerning and the rest of the shaping tables are kept: dropping them would
    # change how text lays out, and this is meant to be invisible.
    options.layout_features = ["*"]
    options.drop_tables = []
    options.notdef_outline = True
    options.recalc_bounds = True
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=sorted(codepoints))
    subsetter.subset(font)
    font.flavor = "woff2"
    font.save(destination)
    return os.path.getsize(destination)


def main():
    critical = critical_codepoints()
    manifest = {"ranges": [[hex(a), hex(b)] for a, b in CRITICAL_RANGES], "faces": {}}
    total_before = 0
    total_subset = 0

    for face in FACES:
        source = os.path.join(SOURCE_DIR, "%s.woff2" % face)
        before = os.path.getsize(source)
        cmap = set(TTFont(source).getBestCmap())

        in_subset = sorted(cmap & critical)
        in_rest = sorted(cmap - critical)

        subset_path = os.path.join(SOURCE_DIR, "%s-subset.woff2" % face)
        rest_path = os.path.join(SOURCE_DIR, "%s-rest.woff2" % face)
        subset_size = write_subset(source, in_subset, subset_path)
        rest_size = write_subset(source, in_rest, rest_path)

        total_before += before
        total_subset += subset_size
        manifest["faces"][face] = {
            "source_bytes": before,
            "subset_bytes": subset_size,
            "rest_bytes": rest_size,
            "subset_codepoints": len(in_subset),
            "rest_codepoints": len(in_rest),
        }
        print("%-14s %7d -> subset %6d (%d cps) + rest %6d (%d cps)"
              % (face, before, subset_size, len(in_subset), rest_size, len(in_rest)))

    with open(MANIFEST, "w", encoding="utf-8") as handle:
        json.dump(manifest, handle, indent=2)
        handle.write("\n")

    print("\npreloaded on the critical path: %d -> %d bytes (%.1f%% smaller)"
          % (total_before, total_subset, 100 * (1 - total_subset / total_before)))


if __name__ == "__main__":
    main()
