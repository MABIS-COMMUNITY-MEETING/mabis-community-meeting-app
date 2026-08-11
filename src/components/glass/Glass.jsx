import React, { useEffect, useRef } from "react";
import { registerGlass } from "@/lib/glass_pointer";

const VARIANTS = {
	compact: "lg-compact",
	regular: "lg-regular",
	navigation: "lg-navigation",
	controller: "lg-controller",
	panel: "lg-panel",
	thick: "lg-thick",
	clear: "lg-clear",
	overlay: "lg-overlay",
};

/*
 * A single plane of liquid glass. Thickness comes from `variant`, tint
 * adaptation from `tone` (the surface it floats over — we know the section
 * theme, so nothing reads back the framebuffer). Never nest one inside
 * another: put plain translucent fills in the content instead.
 */
export default function Glass({
	as: Tag = "div",
	variant = "regular",
	tone = "light",
	className = "",
	contentClassName = "",
	children,
	...rest
}) {
	const ref = useRef(null);

	useEffect(() => registerGlass(ref.current), []);

	const press = (v) => { if (ref.current) ref.current.dataset.glassPress = v ? "1" : "0"; };

	return (
		<Tag
			ref={ref}
			onPointerDown={() => press(true)}
			onPointerUp={() => press(false)}
			onPointerLeave={() => press(false)}
			className={`lg-surface ${VARIANTS[variant] || VARIANTS.regular} lg-on-${tone} ${className}`}
			{...rest}
		>
			<div className={`lg-content ${contentClassName}`}>{children}</div>
		</Tag>
	);
}