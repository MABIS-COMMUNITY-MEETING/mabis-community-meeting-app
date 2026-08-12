import React from "react";

/**
 * Hairline band of the ACTIVE theme's full palette — pride flags and presets
 * carry more colours than the two UI tokens, so this puts the rest on screen.
 */
export default function PaletteStripe() {
	return (
		<div
			aria-hidden
			className="pointer-events-none fixed left-0 top-0 z-[61] h-[3px] w-full"
			style={{ backgroundImage: "var(--palette-stripes, none)" }}
		/>
	);
}