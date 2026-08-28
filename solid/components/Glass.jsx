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
 * One shared, procedural displacement definition for every glass surface.
 *
 * The previous graph embedded a large PNG map, displaced RGB independently,
 * blended the three full-size buffers, then blurred the result. That made the
 * lens expensive and the closing blur turned the requested grain back into
 * frost. One octave of low-frequency noise plus one displacement pass produces
 * a clearer liquid bend with the smallest useful SVG graph. The expanded region
 * prevents the displaced rim from being clipped.
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
          color-interpolation-filters="sRGB"
          filterUnits="objectBoundingBox"
          primitiveUnits="userSpaceOnUse"
          x="-15%"
          y="-30%"
          width="130%"
          height="160%"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.008 0.014"
            numOctaves="1"
            seed="5"
            stitchTiles="stitch"
            result="liquidMap"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="liquidMap"
            scale="38"
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
      return `--glass-lens-filter:${FILTER_URL};${local.style}`;
    }
    return { "--glass-lens-filter": FILTER_URL, ...(local.style || {}) };
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
