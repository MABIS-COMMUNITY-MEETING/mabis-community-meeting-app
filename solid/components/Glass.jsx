import { onMount, onCleanup, splitProps } from "solid-js";
import { Dynamic } from "solid-js/web";
import { registerGlass } from "@/lib/glass_pointer";
/*
 * Glass owns the only deferred stylesheet for the Boss optical surface. The
 * cursor deliberately does not import or consume this material.
 */
import "@/styles/glass.css";

const VARIANTS = {
  compact: "lg-compact",
  regular: "lg-regular",
  navigation: "lg-navigation",
  controller: "lg-controller",
  panel: "lg-panel",
  thick: "lg-thick",
  clear: "lg-clear",
  overlay: "lg-overlay",
};

const FILTER_ID = "glass-distortion";
const FILTER_URL = `url("#${FILTER_ID}")`;


/*
 * The supplied liquid-glass lens, shared once by the persistent header.
 *
 * Resting quality keeps the reference's three channel-specific displacement
 * passes and screen blends. The final feGaussianBlur is intentionally omitted:
 * CSS already applies the requested 1.56px backdrop frost, so blurring the SVG
 * output again would duplicate raster work and wash out the dense grain.
 *
 * There is deliberately no second scroll filter. Even one displacement pass
 * forces a fresh full-surface backdrop raster whenever the page moves. During
 * active scrolling CSS keeps the matte grain/tint/rim but swaps this live
 * optical sample for a cached material paint.
 */
export function GlassFilterDefs() {
  return (
    <svg
      class="liquidGlass-filter-defs"
      width="0"
      height="0"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter
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
        </filter>

      </defs>
    </svg>
  );
}

/*
 * A single plane of liquid glass. Tint and grain remain cached paint layers;
 * only the backdrop plane is sampled. Pointer response writes CSS variables
 * directly and never enters Solid's reactive graph.
 */
export default function Glass(props) {
  const [local, rest] = splitProps(props, [
    "as", "variant", "tone", "class", "contentClass", "children", "style",
  ]);

  let el;

  onMount(() => {
    const unregister = registerGlass(el);
    onCleanup(() => unregister?.());
  });

  const press = (v) => { if (el) el.dataset.glassPress = v ? "1" : "0"; };
  const surfaceStyle = () => {
    if (typeof local.style === "string") {
      return `--glass-distortion-filter:${FILTER_URL};${local.style}`;
    }
    return {
      "--glass-distortion-filter": FILTER_URL,
      ...(local.style || {}),
    };
  };

  return (
    <Dynamic
      component={local.as || "div"}
      ref={el}
      onPointerDown={() => press(true)}
      onPointerUp={() => press(false)}
      onPointerLeave={() => press(false)}
      class={`lg-surface liquidGlass-wrapper ${VARIANTS[local.variant] || VARIANTS.regular} lg-on-${local.tone || "light"} ${local.class || ""}`}
      style={surfaceStyle()}
      {...rest}
    >
      <span class="liquidGlass-effect" aria-hidden="true" />
      <span class="liquidGlass-tint" aria-hidden="true" />
      <span class="liquidGlass-matte" aria-hidden="true" />
      <span class="liquidGlass-shine" aria-hidden="true" />
      <div class={`lg-content liquidGlass-text ${local.contentClass || ""}`}>
        <span class="lg-depth" aria-hidden="true" />
        {local.children}
      </div>
    </Dynamic>
  );
}
