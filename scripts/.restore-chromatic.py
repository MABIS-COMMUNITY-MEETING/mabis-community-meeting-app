"""Restore the chromatic backdrop lens alongside the turbulence fallback."""
import re

MAP = (
    "data:image/png;base64,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"
    "2+q7Wf8znsl4jf8yZ9v8xNAAAAAElFTkSuQmCC"
)

# ── 1. Glass.jsx: add the chromatic filter beside the turbulence one ────────
p = "solid/components/Glass.jsx"
s = open(p, encoding="utf-8").read()

s = s.replace(
    'const FILTER_ID = "glass-distortion";',
    'const FILTER_ID = "glass-distortion";\n'
    'const LENS_ID = "glass-lens-chromatic";\n'
    'const LENS_URL = `url("#${LENS_ID}")`;\n'
    f'const LENS_MAP = "{MAP}";',
)

CHROMATIC = '''
        <filter
          id={LENS_ID}
          color-interpolation-filters="sRGB"
          x="0%"
          y="0%"
          width="100%"
          height="100%"
        >
          <feImage x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map" href={LENS_MAP} />
          <feDisplacementMap in="SourceGraphic" in2="map" result="dispRed" scale="-20" xChannelSelector="R" yChannelSelector="G" />
          <feColorMatrix in="dispRed" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="red" />
          <feDisplacementMap in="SourceGraphic" in2="map" result="dispGreen" scale="-24" xChannelSelector="R" yChannelSelector="G" />
          <feColorMatrix in="dispGreen" type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0" result="green" />
          <feDisplacementMap in="SourceGraphic" in2="map" result="dispBlue" scale="-28" xChannelSelector="R" yChannelSelector="G" />
          <feColorMatrix in="dispBlue" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0" result="blue" />
          <feBlend in="red" in2="green" mode="screen" result="rg" />
          <feBlend in="rg" in2="blue" mode="screen" result="output" />
          <feGaussianBlur in="output" stdDeviation="3" />
        </filter>
'''
s = s.replace("        </filter>\n", "        </filter>\n" + CHROMATIC, 1)

# expose both urls on the surface
s = s.replace(
    "return `--glass-distortion-filter:${FILTER_URL};${local.style}`;",
    "return `--glass-distortion-filter:${FILTER_URL};--glass-lens-filter:${LENS_URL};${local.style}`;",
)
s = s.replace(
    '"--glass-distortion-filter": FILTER_URL,',
    '"--glass-distortion-filter": FILTER_URL,\n      "--glass-lens-filter": LENS_URL,',
)
open(p, "w", encoding="utf-8").write(s)
print("Glass.jsx  chromatic filter:", "glass-lens-chromatic" in s, "| turbulence kept:", "<feTurbulence" in s)
