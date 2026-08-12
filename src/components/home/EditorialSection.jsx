import React from "react";
import { motion } from "framer-motion";
import Tilt3D from "@/components/Tilt3D";

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
			/* off-screen sections skip layout/paint entirely until scrolled near */
			style={{ contentVisibility: "auto", containIntrinsicSize: "1px 900px" }}
			className="relative outline-none grid grid-cols-1 lg:grid-cols-[7rem_1fr] gap-x-8"
		>
			{/* gutter: giant index + vertical japanese label */}
			<div className="hidden lg:flex flex-col items-end pt-1 select-none">
				<Tilt3D max={18}>
					<motion.span
						variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } } }}
						className="block font-display font-thin leading-[0.78] tracking-ultra text-[4.5rem] text-foreground/12 tabular-nums"
						style={{ textShadow: "1px 1px 0 hsl(var(--foreground)/0.06), 3px 3px 0 hsl(var(--foreground)/0.04)" }}
					>
						{index}
					</motion.span>
				</Tilt3D>
				<motion.span
					variants={{ hidden: { scaleY: 0 }, show: { scaleY: 1, transition: { duration: 0.8, ease: EASE } } }}
					style={{ background: flag }}
					className="mt-4 w-px flex-1 min-h-[3rem] origin-top opacity-70"
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
					<motion.h2
						variants={{ hidden: { y: "110%" }, show: { y: 0, transition: { duration: 0.8, ease: EASE } } }}
						className="font-display font-extralight tracking-ultra text-2xl sm:text-4xl leading-none"
					>
						{label}
					</motion.h2>
					<motion.span
						variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1, transition: { duration: 0.9, ease: EASE } } }}
						style={{ backgroundImage: `linear-gradient(90deg, ${flag}, hsl(var(--foreground)/0.18))` }}
						className="flex-1 h-px origin-left"
					/>
				</motion.div>

				<motion.div
					style={{ perspective: 1400, transformStyle: "preserve-3d" }}
					variants={{
						hidden: { y: 26, opacity: 0, rotateX: 9, clipPath: "inset(0 0 100% 0)" },
						show: { y: 0, opacity: 1, rotateX: 0, clipPath: "inset(0 0 0 0)", transition: { duration: 0.9, ease: EASE } },
					}}
				>
					{children}
				</motion.div>
			</div>
		</motion.section>
	);
}