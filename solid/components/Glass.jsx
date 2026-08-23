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
    "as", "variant", "tone", "class", "contentClass", "children",
  ]);

  let el;

  onMount(() => {
    const unregister = registerGlass(el);
    onCleanup(() => unregister?.());
  });

  const press = (v) => { if (el) el.dataset.glassPress = v ? "1" : "0"; };

  return (
    <Dynamic
      component={local.as || "div"}
      ref={el}
      onPointerDown={() => press(true)}
      onPointerUp={() => press(false)}
      onPointerLeave={() => press(false)}
      class={`lg-surface ${VARIANTS[local.variant] || VARIANTS.regular} lg-on-${local.tone || "light"} ${local.class || ""}`}
      {...rest}
    >
      <div class={`lg-content ${local.contentClass || ""}`}>
        <span class="lg-depth" aria-hidden="true" />
        {local.children}
      </div>
    </Dynamic>
  );
}
