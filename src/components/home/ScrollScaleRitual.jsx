import React, { useRef } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";

/*
 * "A WEEKLY RITUAL" — the line grows as it travels up the viewport, so the
 * further you scroll the larger it gets. Scale is driven directly by the
 * band's own scroll progress and smoothed with a spring.
 */
export default function ScrollScaleRitual() {
	const ref = useRef(null);
	const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
	const p = useSpring(scrollYProgress, { stiffness: 80, damping: 24, mass: 0.4 });
	const scale = useTransform(p, [0, 1], [0.55, 1.9]);
	const opacity = useTransform(p, [0, 0.15, 0.85, 1], [0, 1, 1, 0.15]);
	const letter = useTransform(p, [0, 1], ["0.32em", "-0.05em"]);

	return (
		<div ref={ref} className="relative py-24 sm:py-36 overflow-hidden flex justify-center">
			<motion.p
				style={{ scale, opacity, letterSpacing: letter }}
				className="font-display font-thin text-foreground/80 text-[7vw] sm:text-[4vw] leading-none whitespace-nowrap origin-center will-change-transform"
			>
				A WEEKLY RITUAL
			</motion.p>
			<motion.span
				lang="ja"
				style={{ opacity }}
				className="absolute bottom-10 left-1/2 -translate-x-1/2 font-jp text-sm text-foreground/40"
			>
				毎週の儀式
			</motion.span>
		</div>
	);
}