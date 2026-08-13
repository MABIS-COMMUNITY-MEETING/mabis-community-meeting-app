/* HTML ⇄ block model. Documents stay stored as plain HTML, so existing notes
   and the history pages keep working unchanged. */

export const uid = () => Math.random().toString(36).slice(2, 10);

const isList = (t) => t === "ul" || t === "ol";

export function parseBlocks(html) {
	if (!html?.trim()) return [];
	const doc = new DOMParser().parseFromString(html, "text/html");
	const blocks = [];
	doc.body.childNodes.forEach((node) => {
		if (node.nodeType === 3) {
			const text = node.textContent.trim();
			if (text) blocks.push({ id: uid(), type: "p", html: text });
			return;
		}
		if (node.nodeType !== 1) return;
		const tag = node.tagName.toLowerCase();
		if (tag === "img") {
			blocks.push({ id: uid(), type: "img", src: node.getAttribute("src") });
		} else if (["h1", "h2", "h3", "ul", "ol"].includes(tag)) {
			blocks.push({ id: uid(), type: tag === "h3" ? "h2" : tag, html: node.innerHTML });
		} else {
			const img = node.querySelector?.("img");
			if (img && !node.textContent.trim()) blocks.push({ id: uid(), type: "img", src: img.src });
			else if (node.innerHTML?.trim()) blocks.push({ id: uid(), type: "p", html: node.innerHTML });
		}
	});
	return blocks;
}

export function serializeBlocks(blocks) {
	return blocks
		.map((b) => (b.type === "img" ? `<p><img src="${b.src}"/></p>` : `<${b.type}>${b.html || ""}</${b.type}>`))
		.join("");
}

export function convertHtml(from, to, html) {
	if (isList(from) && isList(to)) return html;
	if (isList(from)) {
		const doc = new DOMParser().parseFromString(`<ul>${html}</ul>`, "text/html");
		return Array.from(doc.querySelectorAll("li")).map((li) => li.innerHTML).join("<br>");
	}
	if (isList(to)) return `<li>${html || "<br>"}</li>`;
	return html;
}