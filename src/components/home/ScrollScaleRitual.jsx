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
	const scale = useTransform(p, [0, 1], [0.55, 1.9]);
	const opacity = useTransform(p, [0, 0.15, 0.85, 1], [0, 1, 1, 0.15]);

	return (
		<div ref={ref} className="relative py-24 sm:py-36 overflow-hidden flex justify-center">
			<motion.p
				style={{ scale, opacity }}
				className="font-display font-thin tracking-[0.08em] text-foreground/80 text-[7vw] sm:text-[4vw] leading-none whitespace-nowrap origin-center will-change-transform"
			>
				<JapaneseText ja="あなたの言葉を届けよう">VOICE YOUR WORDS</JapaneseText>
			</motion.p>
		</div>
	);
}