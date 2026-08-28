"""Collapse the chromatic lens to a single objectBoundingBox pass."""
import re

p = "solid/components/Glass.jsx"
s = open(p, encoding="utf-8").read()

start = s.index('        <filter\n          id={LENS_ID}')
end = s.index("</filter>", start) + len("</filter>")

SINGLE = '''        <filter
          id={LENS_ID}
          primitiveUnits="objectBoundingBox"
          color-interpolation-filters="sRGB"
          x="0%"
          y="0%"
          width="100%"
          height="100%"
        >
          <feImage x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="map" href={LENS_MAP} />
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.02" result="blur" />
          <feDisplacementMap
            in="blur"
            in2="map"
            scale="1"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>'''

s = s[:start] + SINGLE + s[end:]
open(p, "w", encoding="utf-8").write(s)

print("displacement passes:", len(re.findall(r"<feDisplacementMap", s)))
print("blends:", len(re.findall(r"<feBlend", s)))
print("primitiveUnits:", "primitiveUnits=\"objectBoundingBox\"" in s)
