import React from "react";

export const OPENMOJI_VERSION = "17.0.0";

function normalizeHexcode(hexcode) {
  const normalized = String(hexcode || "")
    .toUpperCase()
    .replace(/^U\+/, "")
    .replace(/[^0-9A-F-]/g, "");

  if (!normalized) {
    throw new Error("OpenMoji requires a valid Unicode hexcode.");
  }

  return normalized;
}

export function openMojiAssetUrl(hexcode) {
  const normalizedHexcode = normalizeHexcode(hexcode);
  return `/openmoji/${OPENMOJI_VERSION}/${normalizedHexcode}.svg`;
}

export default function OpenMoji({
  hexcode,
  label = "",
  className = "",
  loading = "lazy",
}) {
  return (
    <img
      src={openMojiAssetUrl(hexcode)}
      alt={label}
      aria-hidden={label ? undefined : true}
      width="24"
      height="24"
      loading={loading}
      decoding="async"
      draggable="false"
      className={`openmoji inline-block shrink-0 align-[-0.125em] ${className}`}
    />
  );
}
