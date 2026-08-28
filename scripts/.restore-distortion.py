import re

p = "solid/components/Glass.jsx"
s = open(p, encoding="utf-8").read()

s = s.replace('const FILTER_ID = "glass-filter-chromatic";', 'const FILTER_ID = "glass-distortion";')
s = s.replace("--glass-lens-filter", "--glass-distortion-filter")
s = re.sub(r'\nconst LENS_MAP = "data:image/png;base64,[^"]*";\n', "\n", s)

FILTER = '''        <filter
          id={FILTER_ID}
          x="0%"
          y="0%"
          width="100%"
          height="100%"
          filterUnits="objectBoundingBox"
          color-interpolation-filters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.01 0.01"
            numOctaves="1"
            seed="5"
            result="turbulence"
          />
          <feComponentTransfer in="turbulence" result="mapped">
            <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
            <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
            <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
          </feComponentTransfer>
          <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />
          <feSpecularLighting
            in="softMap"
            surfaceScale="5"
            specularConstant="1"
            specularExponent="100"
            lighting-color="white"
            result="specLight"
          >
            <fePointLight x="-200" y="-200" z="300" />
          </feSpecularLighting>
          <feComposite
            in="specLight"
            operator="arithmetic"
            k1="0"
            k2="1"
            k3="1"
            k4="0"
            result="litImage"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="softMap"
            scale="150"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>'''

start = s.index("        <filter")
end = s.index("</filter>") + len("</filter>")
s = s[:start] + FILTER + s[end:]

open(p, "w", encoding="utf-8").write(s)
print("LENS_MAP removed:", "LENS_MAP" not in s)
print("filter id:", re.search(r'const FILTER_ID = "([^"]+)"', s).group(1))
print("feTurbulence present:", "<feTurbulence" in s)
print("displacement scale 150:", 'scale="150"' in s)
