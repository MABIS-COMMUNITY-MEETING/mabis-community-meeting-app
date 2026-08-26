import { onMount, onCleanup, splitProps } from "solid-js";
import { Dynamic } from "solid-js/web";
import { registerGlass } from "@/lib/glass_pointer";
/*
 * The `.lg-*` rules live with the component that renders them rather than in
 * the entry, so they load only when a glass surface actually exists. Today
 * that means the boss layout's chunk. Co-locating it also keeps it correct if
 * that ever changes: whatever imports Glass gets its stylesheet, and the
 * critical-path assertion in check-css-split.mjs catches it if that import
 * ever lands somewhere eager again.
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

let filterSequence = 0;

function GlassDistortionFilter(props) {
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
          id={props.id}
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
 * Glass — Solid port of src/components/glass/Glass.jsx.
 *
 * A single plane of liquid glass. Thickness comes from `variant`, tint
 * adaptation from `tone` (the surface it floats over — the section theme is
 * known, so nothing reads back the framebuffer). Never nest one inside
 * another: put plain translucent fills in the content instead.
 *
 * The press state is written straight to the dataset rather than through a
 * signal — it is a pointer-rate value consumed only by CSS, so putting it in
 * the reactive graph would be pure overhead.
 */
export default function Glass(props) {
  const [local, rest] = splitProps(props, [
    "as", "variant", "tone", "class", "contentClass", "children", "style",
  ]);
  const filterId = `glass-distortion-${++filterSequence}`;

  let el;

  onMount(() => {
    const unregister = registerGlass(el);
    onCleanup(() => unregister?.());
  });

  const press = (v) => { if (el) el.dataset.glassPress = v ? "1" : "0"; };
  const surfaceStyle = () => {
    const filter = `url("#${filterId}")`;
    if (typeof local.style === "string") {
      return `--glass-distortion-filter:${filter};${local.style}`;
    }
    return { "--glass-distortion-filter": filter, ...(local.style || {}) };
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
      <GlassDistortionFilter id={filterId} />
      <span class="liquidGlass-effect" aria-hidden="true" />
      <span class="liquidGlass-tint" aria-hidden="true" />
      <span class="liquidGlass-shine" aria-hidden="true" />
      <div class={`lg-content liquidGlass-text ${local.contentClass || ""}`}>
        <span class="lg-depth" aria-hidden="true" />
        {local.children}
      </div>
    </Dynamic>
  );
}
