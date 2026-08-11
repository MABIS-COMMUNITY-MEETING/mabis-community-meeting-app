import React from "react";
import { motion } from "framer-motion";
import ControllerGlyph from "@/components/ControllerGlyph";
import { FAMILY_LABEL } from "@/lib/gamepad_profiles";
import { MODE_LABEL } from "@/lib/gamepad_detect";

/* Pinned input prompt bar — appears only while a controller is in use. */
export default function ControllerHints({ profile }) {
	const family = profile.family;
	return (
		<motion.div
			initial={{ opacity: 0, y: 14 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: 14 }}
			transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
			className="fixed bottom-0 left-0 right-0 z-[70] flex items-center gap-5 border-t border-foreground/15 bg-background/95 px-5 py-2 text-foreground"
		>
			<span className="tech-label text-muted-foreground">
				{MODE_LABEL[profile.mode]} ／ {FAMILY_LABEL[family]}
			</span>
			<span className="flex-1 h-px bg-foreground/10" />
			<span className="flex items-center gap-1.5 tech-label">
				<span className="font-mono text-[10px]">✛</span> MOVE
			</span>
			<span className="flex items-center gap-1.5 tech-label">
				<ControllerGlyph family={family} action="confirm" /> SELECT
			</span>
			<span className="flex items-center gap-1.5 tech-label">
				<ControllerGlyph family={family} action="cancel" /> BACK
			</span>
		</motion.div>
	);
}