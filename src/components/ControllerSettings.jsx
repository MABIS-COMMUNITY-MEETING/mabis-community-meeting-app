import React, { useEffect, useState } from "react";
import { Gamepad2 } from "lucide-react";
import { FAMILY_XBOX, FAMILY_PLAYSTATION, FAMILY_NINTENDO, FAMILY_LABEL } from "@/lib/gamepad_profiles";
import { resolve_profile, set_glyph_override, get_glyph_override, MODE_LABEL, OVERRIDE_EVENT } from "@/lib/gamepad_detect";

const OPTIONS = [
	{ value: "", label: "AUTO" },
	{ value: FAMILY_XBOX, label: "XBOX" },
	{ value: FAMILY_PLAYSTATION, label: "PLAYSTATION" },
	{ value: FAMILY_NINTENDO, label: "NINTENDO" },
];

const Row = ({ k, v }) => (
	<div className="flex items-center justify-between gap-3 py-1.5 border-b border-gray-100 last:border-0">
		<span className="tech-label text-gray-400">{k}</span>
		<span className="font-mono text-[11px] text-gray-700 truncate max-w-[60%] text-right">{v}</span>
	</div>
);

export default function ControllerSettings() {
	const [override, setOverride] = useState(get_glyph_override() || "");
	const [profile, setProfile] = useState(null);

	useEffect(() => {
		const read = () => {
			const pad = Array.from(navigator.getGamepads?.() || []).find(Boolean);
			setProfile(pad ? resolve_profile(pad) : null);
		};
		read();
		const t = setInterval(read, 700);
		window.addEventListener(OVERRIDE_EVENT, read);
		return () => { clearInterval(t); window.removeEventListener(OVERRIDE_EVENT, read); };
	}, []);

	const choose = (v) => { setOverride(v); set_glyph_override(v || null); };

	return (
		<div>
			<div className="flex items-center gap-2 mb-3">
				<Gamepad2 className="w-4 h-4 text-[#951E3A]" />
				<h3 className="font-display font-bold text-gray-800 text-sm uppercase tracking-wide">Controller</h3>
			</div>

			<div className="mb-3">
				<Row k="CONTROLLER" v={profile ? profile.id || "CONNECTED" : "NONE CONNECTED"} />
				<Row k="INPUT" v={profile ? MODE_LABEL[profile.mode] : "—"} />
				<Row k="GLYPHS" v={FAMILY_LABEL[profile?.family || FAMILY_XBOX]} />
				<Row k="MAPPING" v={profile ? (profile.mapping === "standard" ? "STANDARD" : "CUSTOM") : "—"} />
			</div>

			<div className="grid grid-cols-2 gap-2">
				{OPTIONS.map((o) => (
					<button key={o.value || "auto"} onClick={() => choose(o.value)}
						className={`h-9 tech-label border-2 transition-colors ${override === o.value ? "border-[#951E3A] bg-[#951E3A]/5 text-[#951E3A]" : "border-gray-200 text-gray-500"}`}>
						{o.label}
					</button>
				))}
			</div>
			<p className="text-xs text-gray-400 mt-2">AUTO follows the detected controller mode.</p>
		</div>
	);
}