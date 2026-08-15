import React, { useRef } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import JapaneseText from "@/components/JapaneseText";

/*
 * "VOICE YOUR WORDS" — the line grows as it travels up the viewport. Scroll
 * frames only update transform and opacity, keeping the effect composited
 * instead of triggering text layout on every frame.
 */
export default function ScrollScaleRitual() {
	const ref = useRef(null);
	const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
	const p = useSpring(scrollYProgress, { stiffness: 80, damping: 24, mass: 0.4 });
	// Range kept modest deliberately. At the old 0.55-1.9 the line ended up
	// around 13vw on a phone, which is roughly 128vw of nowrap text — it ran off
	// both edges and was clipped by the overflow-hidden below, so the "zoom"
	// just looked broken. 0.82-1.28 stays inside the viewport at every step.
	const scale = useTransform(p, [0, 1], [0.82, 1.28]);
	const opacity = useTransform(p, [0, 0.15, 0.85, 1], [0, 1, 1, 0.15]);

	return (
		<div ref={ref} className="relative py-24 sm:py-36 overflow-hidden flex justify-center">
			<motion.p
				style={{ scale, opacity }}
				className="font-display font-thin tracking-[0.08em] text-foreground/80 text-[6vw] sm:text-[3.6vw] leading-none whitespace-nowrap origin-center will-change-transform"
			>
				<JapaneseText ja="あなたの言葉を届けよう">VOICE YOUR WORDS</JapaneseText>
			</motion.p>
		</div>
	);
}