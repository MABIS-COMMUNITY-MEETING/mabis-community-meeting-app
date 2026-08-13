import React from "react";
import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1];

/*
 * Split masthead. The title is edge-aligned and deliberately oversized so it
 * crops at the viewport edge; metadata is pushed far away into a narrow right
 * column instead of sitting under the heading. No centred hero block.
 */
export default function HomeMasthead({ week_label, date_label }) {
	return (
		<section className="relative min-h-[62vh] grid grid-cols-1 lg:grid-cols-[1fr_15rem] gap-y-10 gap-x-10 items-end pb-10 border-b border-foreground/15">
			<div className="min-w-0">
				<motion.div
					initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}
					className="flex items-center gap-3 mb-10"
				>
					<span className="pulse-dot inline-block h-1.5 w-1.5 bg-primary" />
					<span className="tech-label text-muted-foreground">LIVE ／ DASHBOARD</span>
				</motion.div>

				{/* oversized type is the composition; no 3D tilt competing with it */}
				<h1 className="font-display font-normal tracking-[-0.055em] leading-[0.94]">
					<span className="reveal-mask">
						<motion.span
							initial={{ y: "102%" }} animate={{ y: 0 }}
							transition={{ duration: 0.82, ease: EASE, delay: 0.08 }}
							className="block text-[11.5vw] lg:text-[7.6vw] -ml-[0.035em] pb-[0.05em]"
						>
							COMMUNITY
						</motion.span>
					</span>
					<span className="reveal-mask">
						<motion.span
							initial={{ y: "102%" }} animate={{ y: 0 }}
							transition={{ duration: 0.82, ease: EASE, delay: 0.16 }}
							className="block text-[11.5vw] lg:text-[7.6vw] -ml-[0.035em] pb-[0.05em] text-foreground/28"
						>
							MEETING
						</motion.span>
					</span>
					<span className="mt-5 block font-jp text-sm sm:text-base tracking-[0.22em] text-muted-foreground">コミュニティ会議</span>
				</h1>
			</div>

			<motion.aside
				initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.7, ease: EASE, delay: 0.45 }}
				className="lg:pb-6 lg:border-l lg:border-foreground/15 lg:pl-6 space-y-5"
			>
				<dl className="space-y-2.5 tech-label text-muted-foreground">
					<div className="flex justify-between gap-4"><dt>WEEK</dt><dd className="text-foreground tabular-nums">{week_label}</dd></div>
					<div className="flex justify-between gap-4"><dt>DATE</dt><dd className="text-foreground tabular-nums">{date_label}</dd></div>
					<div className="flex justify-between gap-4"><dt>CYCLE</dt><dd className="text-foreground">FRIDAY</dd></div>
					<div className="flex justify-between gap-4"><dt>LOCAL</dt><dd className="text-foreground">MABIS ／ BKK</dd></div>
					<div className="flex justify-between gap-4"><dt>INDEX</dt><dd className="text-foreground tabular-nums">10</dd></div>
				</dl>
				<div className="h-px bg-foreground/15" />
				<p className="tech-label text-muted-foreground">SCROLL ↓</p>
			</motion.aside>
		</section>
	);
}