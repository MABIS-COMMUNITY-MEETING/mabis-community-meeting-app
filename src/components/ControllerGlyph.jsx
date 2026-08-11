import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { action_binding } from "@/lib/gamepad_profiles";

/*
 * Thin geometric button glyph. When the active controller family changes the
 * old glyph clips away and the new one wipes in through a mask — the label
 * beside it never moves.
 */
export default function ControllerGlyph({ family, action, className = "" }) {
	const b = action_binding(family, action);
	const round = b.shape === "circle" ? "rounded-full" : "rounded-[2px]";
	const w = b.shape === "circle" ? "w-5" : "w-auto px-1.5";

	return (
		<span className={`relative inline-flex h-5 ${w} items-center justify-center overflow-hidden`} aria-hidden>
			<AnimatePresence mode="popLayout" initial={false}>
				<motion.span
					key={`${family}-${b.label}`}
					initial={{ clipPath: "inset(50% 0 50% 0)", opacity: 0 }}
					animate={{ clipPath: "inset(0% 0 0% 0)", opacity: 1 }}
					exit={{ clipPath: "inset(50% 0 50% 0)", opacity: 0 }}
					transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
					className={`inline-flex h-5 ${w} items-center justify-center border ${round} border-current font-mono text-[10px] leading-none ${className}`}
				>
					{b.label}
				</motion.span>
			</AnimatePresence>
		</span>
	);
}