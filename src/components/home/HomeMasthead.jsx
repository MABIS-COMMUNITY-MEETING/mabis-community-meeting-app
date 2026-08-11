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

				<h1 className="font-display font-thin tracking-ultra leading-[0.8]">
					<span className="reveal-mask">
						<motion.span
							initial={{ y: "110%" }} animate={{ y: 0 }}
							transition={{ duration: 1, ease: EASE, delay: 0.1 }}
							className="block text-[12vw] lg:text-[8.5vw] -ml-[0.06em]"
						>
							COMMUNITY
						</motion.span>
					</span>
					<span className="reveal-mask">
						<motion.span
							initial={{ y: "110%" }} animate={{ y: 0 }}
							transition={{ duration: 1, ease: EASE, delay: 0.2 }}
							className="block text-[12vw] lg:text-[8.5vw] -ml-[0.06em] text-stroke"
						>
							MEETING
						</motion.span>
					</span>
				</h1>
			</div>

			<motion.aside
				initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.7, ease: EASE, delay: 0.45 }}
				className="lg:pb-6 lg:border-l lg:border-foreground/15 lg:pl-6 space-y-5"
			>
				<p lang="ja" className="font-jp text-2xl text-foreground/60 leading-snug">
					コミュニティ<br />ミーティング
				</p>
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