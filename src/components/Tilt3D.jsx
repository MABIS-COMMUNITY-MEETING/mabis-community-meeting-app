import React, { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { isLinux } from "@/lib/perf";

/*
 * Pointer-driven 3D tilt. Purely decorative: the element settles perfectly flat
 * when the pointer leaves, so it never sits at an angle over real content.
 * Skipped entirely in perf-lite (Linux) and reduced-motion.
 */
export default function Tilt3D({ children, max = 12, className = "" }) {
	const ref = useRef(null);
	const mx = useMotionValue(0);
	const my = useMotionValue(0);
	const rx = useSpring(useTransform(my, [-0.5, 0.5], [max, -max]), { stiffness: 160, damping: 18 });
	const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-max, max]), { stiffness: 160, damping: 18 });

	const off =
		isLinux ||
		(typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

	if (off) return <div className={className}>{children}</div>;

	const on_move = (e) => {
		const r = ref.current.getBoundingClientRect();
		mx.set((e.clientX - r.left) / r.width - 0.5);
		my.set((e.clientY - r.top) / r.height - 0.5);
	};

	return (
		<div ref={ref} onMouseMove={on_move} onMouseLeave={() => { mx.set(0); my.set(0); }}
			className={className} style={{ perspective: 800 }}>
			<motion.div style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}>
				{children}
			</motion.div>
		</div>
	);
}