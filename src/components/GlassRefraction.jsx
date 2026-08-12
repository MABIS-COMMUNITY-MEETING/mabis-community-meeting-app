import { createPortal } from "react-dom";

/**
 * The optical pipeline for the glass cursor.
 *
 * `#lg-lens` is a real displacement map, not a blur: the map encodes a thin-lens
 * normal field — R carries the horizontal component of the surface normal, G the
 * vertical one, both zero at the centre and rising toward the silhouette, masked
 * by the body's elliptical cross-section. feDisplacementMap then resamples the
 * page behind the cursor along that field, so straight lines and typography bend
 * through the thick centre and recover instantly outside the glass.
 *
 * Three variants exist so dispersion can be approximated: the R/G/B channels are
 * sampled with minutely different refractive strengths.
 */
const MAP = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">
  <defs>
    <linearGradient id="h" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#f00"/>
    </linearGradient>
    <linearGradient id="v" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#0f0"/>
    </linearGradient>
    <radialGradient id="t">
      <stop offset="0.35" stop-color="#fff" stop-opacity="1"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <mask id="m"><circle cx="64" cy="64" r="63" fill="url(#t)"/></mask>
  </defs>
  <g mask="url(#m)">
    <rect width="128" height="128" fill="url(#h)"/>
    <rect width="128" height="128" fill="url(#v)" style="mix-blend-mode:screen"/>
  </g>
</svg>`);

const lens = (id, scale, blur) => (
  <filter id={id} x="-35%" y="-35%" width="170%" height="170%" colorInterpolationFilters="sRGB">
    <feImage href={`data:image/svg+xml,${MAP}`} preserveAspectRatio="none"
      x="0" y="0" width="100%" height="100%" result="map" />
    <feDisplacementMap in="SourceGraphic" in2="map" scale={scale}
      xChannelSelector="R" yChannelSelector="G" result="disp" />
    <feGaussianBlur in="disp" stdDeviation={blur} />
  </filter>
);

export default function GlassRefraction() {
  return createPortal(
    <svg width="0" height="0" aria-hidden style={{ position: "fixed", pointerEvents: "none" }}>
      <defs>
        {lens("lg-lens", 34, 0.35)}
        {lens("lg-lens-thick", 62, 0.6)}
      </defs>
    </svg>,
    document.body
  );
}