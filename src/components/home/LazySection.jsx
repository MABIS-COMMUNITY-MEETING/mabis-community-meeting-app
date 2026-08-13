import React, { useEffect, useRef, useState } from "react";

/*
 * Below-fold widgets are expensive (calendars, editors, tables, canvases).
 * Mounting them all on first paint made the initial render and every style
 * recalculation pay for the whole page. Each section now mounts only when it
 * approaches the viewport (generous margin, so it is always ready before the
 * user reaches it) and stays mounted afterwards — no unmount churn, no popping.
 */
export default function LazySection({ minHeight = 480, children }) {
	const ref = useRef(null);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		if (mounted || typeof IntersectionObserver === "undefined") {
			setMounted(true);
			return;
		}
		const io = new IntersectionObserver(
			(entries) => {
				if (entries.some((e) => e.isIntersecting)) {
					setMounted(true);
					io.disconnect();
				}
			},
			{ rootMargin: "1200px 0px" }
		);
		io.observe(ref.current);
		return () => io.disconnect();
	}, [mounted]);

	// The placeholder reserves approximate space so scrollbar/anchor geometry
	// stays stable; it is replaced by real content long before it is visible.
	return <div ref={ref}>{mounted ? children : <div style={{ minHeight }} aria-hidden />}</div>;
}