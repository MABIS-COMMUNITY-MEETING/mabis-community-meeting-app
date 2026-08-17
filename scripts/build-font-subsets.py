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

# Every range first paint can need.
#
# Chosen from what the BUILT bundle contains, not the source. The source is
# full of Greek (spring-physics comments in lib/physics), box drawing (the ──
# section rules in comments) and math operators (∇ √ ∝), none of which survive
# minification and none of which are ever rendered. Including those blocks
# measured at +5.7K, +3.4K and +13.9K respectively on FreeMono alone, to ship
# glyphs for characters that do not exist in the shipped app.
#
# Whole blocks are still used where the block is cheap and its members are
# genuinely reachable, so adding one more dash or arrow to the UI does not
# silently pull the 139 KiB rest file onto the critical path.
# check-font-subset.mjs fails the build if a codepoint in dist/ escapes this
# set while being covered by the source font.
CRITICAL_RANGES = [
    (0x0000, 0x00FF),  # Latin-1: the entire UI, and accented names.       16.5K
    (0x0131, 0x0131),  # dotless i
    (0x0152, 0x0153),  # OE ligatures
    (0x02BB, 0x02BC),
    (0x02C6, 0x02C6),
    (0x02DA, 0x02DA),
    (0x02DC, 0x02DC),
    # Decomposed accents: macOS and some IMEs produce e + U+0301 rather than
    # the precomposed character, and a member's name is exactly where that
    # shows up. 5.1K to insure against a 139 KiB fetch on their profile.
    (0x0300, 0x036F),
    # Rendered: em dash (Splash "01 —", empty-value placeholders), en dash,
    # curly quotes, bullet, ellipsis, angle quote.                          3.0K
    (0x2000, 0x206F),
    (0x2070, 0x209F),  # superscripts and subscripts                        1.2K
    (0x2190, 0x21FF),  # rendered: → in jobs/tables.jsx, ⇄ in the notes editor  4.6K
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
