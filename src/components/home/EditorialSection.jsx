import React from "react";
import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1];

/*
 * Offset-column section chrome.
 *
 * Replaces the old full-width "header bar + panel" stack. The index number
 * lives OUTSIDE the content column as oversized graphic material, the Japanese
 * label runs vertically down the gutter, and the content sits in an offset
 * column so the page reads as an editorial index rather than a widget stack.
 */
export default function EditorialSection({ index = "00", label = "", jp = "", children }) {
	/* each section takes the next colour of the active theme's palette, so
	   multi-colour themes (pride flags) show up beyond primary/secondary */
	const flag = `var(--flag-${((parseInt(index, 10) || 1) % 8) + 1}, hsl(var(--primary)))`;
	return (
		<motion.section
			id={`sec-${index}`}
			data-gp-section
			tabIndex={-1}
			aria-label={`${index} ${label}`}
			initial="hidden"
			whileInView="show"
			viewport={{ once: true, margin: "-10% 0px" }}
			variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
			className="relative outline-none grid grid-cols-1 lg:grid-cols-[7rem_1fr] gap-x-8"
		>
			{/* gutter: quiet index, ruled rhythm and real Japanese secondary label */}
			<div className="hidden lg:flex flex-col items-end pt-1 select-none">
				<motion.span
					variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } } }}
					className="block font-display font-light leading-none tracking-[0.02em] text-[3.75rem] text-foreground/14 tabular-nums"
				>
					{index}
				</motion.span>
				{jp && <span className="font-jp vert-text mt-5 text-[13px] tracking-[0.18em] text-muted-foreground">{jp}</span>}
				<motion.span
					variants={{ hidden: { scaleY: 0 }, show: { scaleY: 1, transition: { duration: 0.65, ease: EASE } } }}
					style={{ background: flag }}
					className="mt-5 w-px flex-1 min-h-[3rem] origin-top opacity-45"
				/>
			</div>

			<div className="min-w-0">
				<motion.div
					variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
					className="flex items-baseline gap-3 mb-4"
				>
					<motion.span
						variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.4 } } }}
						style={{ color: flag }}
						className="lg:hidden tech-label tabular-nums"
					>
						{index}
					</motion.span>
					<motion.span
						variants={{ hidden: { scale: 0 }, show: { scale: 1, transition: { duration: 0.4, ease: EASE } } }}
						style={{ background: flag }}
						className="hidden lg:block h-2 w-2 shrink-0 self-center"
					/>
					<div className="min-w-0">
						<motion.h2
							variants={{ hidden: { y: 10, opacity: 0 }, show: { y: 0, opacity: 1, transition: { duration: 0.6, ease: EASE } } }}
							className="font-display font-medium tracking-[-0.035em] text-2xl sm:text-[2.15rem] leading-none"
						>
							{label}
						</motion.h2>
						{jp && <span className="lg:hidden mt-1 block font-jp text-xs tracking-[0.14em] text-muted-foreground">{jp}</span>}
					</div>
					<motion.span
						variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1, transition: { duration: 0.9, ease: EASE } } }}
						style={{ backgroundImage: `linear-gradient(90deg, ${flag}, hsl(var(--foreground)/0.18))` }}
						className="flex-1 h-px origin-left"
					/>
				</motion.div>

				{/* no transform / clip / containment stays on this wrapper once revealed —
				    those create a containing block that broke widgets' full-screen mode */}
				<motion.div
					variants={{
						hidden: { opacity: 0 },
						show: { opacity: 1, transition: { duration: 0.7, ease: EASE } },
					}}
				>
					{children}
				</motion.div>
			</div>
		</motion.section>
	);
}