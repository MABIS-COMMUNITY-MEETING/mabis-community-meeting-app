import React, { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { subscribe, wake } from "@/lib/physics/scheduler";

/*
 * Pointer-driven 3D tilt. Purely decorative: the element settles perfectly flat
 * when the pointer leaves, so it never sits at an angle over real content.
 * Skipped under reduced-motion.
 */
export default function Tilt3D({ children, max = 12, className = "" }) {
	const ref = useRef(null);
	const mx = useMotionValue(0);
	const my = useMotionValue(0);
	const rx = useSpring(useTransform(my, [-0.5, 0.5], [max, -max]), { stiffness: 160, damping: 18 });
	const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-max, max]), { stiffness: 160, damping: 18 });
	const runtime = useRef({ rect: null, x: 0, y: 0, dirty: false, unsubscribe: null });

	useEffect(() => () => runtime.current.unsubscribe?.(), []);

	const off =
		typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	if (off) return <div className={className}>{children}</div>;

	const on_enter = () => {
		const rt = runtime.current;
		rt.rect = ref.current.getBoundingClientRect();
		if (!rt.unsubscribe) rt.unsubscribe = subscribe({
			step: () => {},
			render: () => {
				if (!rt.dirty || !rt.rect) return;
				rt.dirty = false;
				mx.set((rt.x - rt.rect.left) / rt.rect.width - 0.5);
				my.set((rt.y - rt.rect.top) / rt.rect.height - 0.5);
			},
			settled: () => !rt.dirty,
		});
	};
	const on_move = (e) => {
		const rt = runtime.current;
		rt.x = e.clientX; rt.y = e.clientY; rt.dirty = true;
		wake();
	};
	const on_leave = () => {
		const rt = runtime.current;
		rt.unsubscribe?.(); rt.unsubscribe = null; rt.rect = null; rt.dirty = false;
		mx.set(0); my.set(0);
	};

	return (
		<div ref={ref} onPointerEnter={on_enter} onPointerMove={on_move} onPointerLeave={on_leave}
			className={className} style={{ perspective: 800 }}>
			<motion.div style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}>
				{children}
			</motion.div>
		</div>
	);
}