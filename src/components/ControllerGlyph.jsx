import React from "react";
import { action_binding } from "@/lib/gamepad_profiles";

/* Thin geometric button glyph — Iosevka label inside a hairline shape. */
export default function ControllerGlyph({ family, action, className = "" }) {
	const b = action_binding(family, action);
	const round = b.shape === "circle" ? "rounded-full" : "rounded-[2px]";
	const w = b.shape === "circle" ? "w-5" : "w-auto px-1.5";
	return (
		<span
			className={`inline-flex h-5 ${w} items-center justify-center border ${round} border-current font-mono text-[10px] leading-none ${className}`}
			aria-hidden
		>
			{b.label}
		</span>
	);
}