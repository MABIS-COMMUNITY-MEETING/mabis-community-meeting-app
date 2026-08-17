import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

/*
 * Source-agnostic file lookup.
 *
 * These contracts were written when React was the only UI. Every assertion
 * names a path under src/, so removing the React UI layer would fail the build
 * at prebuild with "Missing mandatory file" before Vite even runs — the design
 * rules would look violated when all that changed was which framework renders
 * them. The rules are about the product, not the framework.
 *
 * So a React UI path that no longer exists falls back to its Solid counterpart.
 * While both builds exist this never triggers; once src/ holds only the shared
 * lib/api/styles layer, the same rules keep being enforced against solid/.
 */
function resolveSourcePath(relativePath) {
    if (fs.existsSync(path.join(root, relativePath))) return relativePath;
    const solidPath = relativePath
        .replace(/^src\/components\//, "solid/components/")
        .replace(/^src\/pages\//, "solid/pages/")
        .replace(/^src\/(App|main)\.jsx$/, "solid/$1.jsx");
    return solidPath !== relativePath && fs.existsSync(path.join(root, solidPath))
        ? solidPath
        : relativePath;
}

/*
 * Where a rule lives once the UI is Solid. See the note in
 * check-performance-contract.mjs — the rules are about the product, not about
 * which framework renders it, so a React UI path that no longer exists
 * resolves to its Solid counterpart. Solid exports JapaneseText and OpenMoji
 * from shared primitive modules rather than as standalone files.
 */
const SOLID_EQUIVALENTS = {
    "src/lib/home-route-warmup.js": ["solid/lib/home-warmup.js"],
    "src/lib/query-client.js": ["solid/lib/query-client.js"],
    // Solid's route table lives in solid/lib/routes.js and deliberately does
    // not reuse the React loaders — see the note in that file.
    "src/lib/routeLoaders.js": ["solid/lib/routes.js"],
    "src/components/JapaneseText.jsx": ["solid/components/primitives.jsx"],
    "src/components/OpenMoji.jsx": ["solid/components/page-chrome.jsx"],
    "src/components/home/HomeSectionIndex.jsx": ["solid/components/home/shell.jsx"],
    "src/components/home/LazySection.jsx": ["solid/components/home/shell.jsx", "solid/lib/perf.js"],
    "src/components/JobsWidget.jsx": ["solid/components/JobsWidget.jsx", "solid/components/jobs/SpinWheel.jsx"],
};

function resolveSourceFiles(requestedPath) {
    if (fs.existsSync(path.join(root, requestedPath))) return [requestedPath];
    const mapped = (SOLID_EQUIVALENTS[requestedPath] || []).filter((f) => fs.existsSync(path.join(root, f)));
    if (mapped.length) return mapped;
    const guess = requestedPath
        .replace(/^src\/components\//, "solid/components/")
        .replace(/^src\/pages\//, "solid/pages/")
        .replace(/^src\/(App|main)\.jsx$/, "solid/$1.jsx");
    return [fs.existsSync(path.join(root, guess)) ? guess : requestedPath];
}

function read(requestedPath) {
    const files = resolveSourceFiles(requestedPath);
    const missing = files.filter((f) => !fs.existsSync(path.join(root, f)));
    if (missing.length) {
        failures.push(`Missing mandatory file: ${missing.join(", ")}`);
        return "";
    }
    return files.map((f) => fs.readFileSync(path.join(root, f), "utf8")).join("\n");
}

/* An array means "any of these spellings satisfies the rule". */
function requireText(relativePath, content, requiredText) {
    const wanted = Array.isArray(requiredText) ? requiredText : [requiredText];
    if (!wanted.some((t) => content.includes(t))) {
        failures.push(`${relativePath} must contain: ${wanted.join(" OR ")}`);
    }
}

function forbidText(relativePath, content, forbiddenText) {
    if (content.includes(forbiddenText)) {
        failures.push(`${relativePath} must not contain: ${forbiddenText}`);
    }
}

function listSourceFiles(relativeDir) {
    const absoluteDir = path.join(root, relativeDir);
    return fs.readdirSync(absoluteDir, { withFileTypes: true }).flatMap((entry) => {
        const relativePath = path.join(relativeDir, entry.name);
        return entry.isDirectory() ? listSourceFiles(relativePath) : [relativePath];
    });
}

const readme = read("README.md");
const agents = read("AGENTS.md");
const claude = read("CLAUDE.md");
const gemini = read("GEMINI.md");
const cursorRule = read(".cursor/rules/novesce-design.mdc");
const copilot = read(".github/copilot-instructions.md");
const themes = read("src/lib/themes.js");
const css = read("src/index.css");
const editorialHomeCss = read("src/styles/editorial-home.css");
const main = read("src/main.jsx");
const home = read("src/pages/Home.jsx");
const cursorPreference = read("src/lib/cursor-preference.js");
const themeBalance = read("src/lib/color/themeBalance.js");
const themeBalanceCheck = read("scripts/check-theme-balance.mjs");
const packageJson = read("package.json");
const performanceContract = read("scripts/check-performance-contract.mjs");
const bundleBudget = read("scripts/check-bundle-budget.mjs");
const cjkFontLoader = read("src/components/CjkFontLoader.jsx");
const login = read("src/pages/Login.jsx");
const docsEditor = read("src/components/DocsEditor.jsx");
const jobsWidget = read("src/components/JobsWidget.jsx");
const jobsRotation = read("src/lib/jobsRotation.js");
const homeSectionIndex = read("src/components/home/HomeSectionIndex.jsx");
const quickStartGuide = read("src/components/QuickStartGuide.jsx");
const japaneseText = read("src/components/JapaneseText.jsx");
const japanesePreference = read("src/lib/japanese-text-preference.js");
const settingsModal = read("src/components/SettingsModal.jsx");
const themeSwitcher = read("src/components/ThemeSwitcher.jsx");
const scrollScaleRitual = read("src/components/home/ScrollScaleRitual.jsx");
const app = read("src/App.jsx");
const routeLoaders = read("src/lib/routeLoaders.js");
const openMoji = read("src/components/OpenMoji.jsx");
const openMojiLicense = read("public/openmoji/LICENSE.txt");

const readmeRules = [
    "## Mandatory rule for AI contributors",
    "## Novesce UI mandate",
    "research Japanese web design in depth before writing or editing any project code",
    "GNU FreeMono is the default UI font",
    "Thai falls back to the Thai-only **GNU FreeSerif** face",
    "Explicitly marked Chinese, Japanese, and Korean text uses **Maple Mono** first",
    "The public authentication surface is Google-only",
    "### Emoji and iconography",
    "All app-authored emoji must use pinned, production-ready OpenMoji color SVGs",
    "Apple-style optical liquid glass",
    "No romaji decoration",
    "Preserve outlines and borders",
    "### AI enforcement procedure",
    "# Performance architecture",
    "Large Home widgets remain behind near-viewport `LazySection` and `React.lazy` boundaries",
];

for (const rule of readmeRules) {
    requireText("README.md", readme, rule);
}

const agentRules = [
    "These instructions apply to every AI agent",
    "The `Novesce UI mandate` and design contract in `README.md`",
    "A task is incomplete if it works technically but violates the design contract",
];

for (const rule of agentRules) {
    requireText("AGENTS.md", agents, rule);
}

const editorialHomeRule = "Preserve the Home editorial normalization in `src/styles/editorial-home.css`: neutral ruled content planes, restrained radii, no widget elevation, and edge-to-edge mobile modules.";
const editorialContractFiles = [
    ["README.md", readme],
    ["AGENTS.md", agents],
    ["CLAUDE.md", claude],
    ["GEMINI.md", gemini],
    [".cursor/rules/novesce-design.mdc", cursorRule],
    [".github/copilot-instructions.md", copilot],
];
for (const [relativePath, content] of editorialContractFiles) {
    requireText(relativePath, content, editorialHomeRule);
}

const richTextThemeRule = "Rich-text editors and rendered rich text must pair semantic card/ink tokens; selectable letter colors and highlights use contrast-safe theme roles, never fixed black, white, or raw swatches.";
const easyLayoutRule = "Keep Home easy to navigate with its numbered editorial sections, plain-language page guide, and contextual instructions; usability aids must clarify the existing Japanese editorial hierarchy rather than replace it with a generic dashboard.";
const japaneseTextRule = "Japanese companion text is opt-in, shown alongside—not instead of—the English interface, stored per user, and marked with `lang=\"ja\"` so Maple Mono CJK fallback applies; the default remains off.";
const simpleCustomizationRule = "Customization surfaces show a small set of plain-language default choices first, with large theme/font catalogues and custom color tools behind clearly labeled advanced controls.";
const jobsPeriodRule = "Built-in jobs remain weekly except Time Keepers, who serve monthly and cannot be selected again in the same calendar year; custom jobs may choose weekly or monthly periods.";
const homeLayoutRule = "Home has two layouts: the simple stacked layout is the default, and the art-directed editorial layout is opt-in as `Boss layout` in Settings. Anything added, changed or fixed in the default layout must exist in the Boss layout too — they are two arrangements of one page, not two products.";
for (const [relativePath, content] of editorialContractFiles) {
    requireText(relativePath, content, richTextThemeRule);
    requireText(relativePath, content, easyLayoutRule);
    requireText(relativePath, content, japaneseTextRule);
    requireText(relativePath, content, simpleCustomizationRule);
    requireText(relativePath, content, jobsPeriodRule);
    requireText(relativePath, content, homeLayoutRule);
}

/*
 * The layout choice itself, asserted in code as well as in prose.
 *
 * The default is the load-bearing half: an AI "tidying up" the preference back
 * to the editorial layout would undo an explicit request from Novesce, and
 * nothing else in the build would notice.
 */
const layoutPreference = read("src/lib/layout-preference.js");
requireText("src/lib/layout-preference.js", layoutPreference, 'DEFAULT_HOME_LAYOUT = "simple"');
requireText("src/lib/layout-preference.js", layoutPreference, 'HOME_LAYOUTS = ["simple", "boss"]');
requireText("src/pages/Home.jsx", home, ["const isBoss = () => layout() === \"boss\""]);
requireText("src/components/SettingsModal.jsx", settingsModal, "Boss layout");

const cursorTrackingRule = "The custom cursor's core dot must follow browser `clientX`/`clientY` in CSS pixels without prediction, magnetic displacement, device-pixel-ratio scaling, or accumulating lag; a tightly capped spatial deadband may suppress subpixel and one-pixel OS jitter, and the outer ring may use bounded spring-follow displacement.";
const cursorContractFiles = [
    ["README.md", readme],
    ["AGENTS.md", agents],
    ["CLAUDE.md", claude],
    ["GEMINI.md", gemini],
    [".cursor/rules/novesce-design.mdc", cursorRule],
    [".github/copilot-instructions.md", copilot],
];
for (const [relativePath, content] of cursorContractFiles) {
    requireText(relativePath, content, cursorTrackingRule);
}

const cursorDeformationRule = "Custom-cursor deformation should use bounded underdamped springs, settle promptly, and never loop while idle.";
for (const [relativePath, content] of cursorContractFiles) {
    requireText(relativePath, content, cursorDeformationRule);
}

const scrollGlassRule = "Preserve live single-pass glass backdrop blur during wheel, touch, rapid, and momentum scrolling; active-scroll optimizations may pause decoration but must not replace glass with an opaque fallback.";
for (const [relativePath, content] of editorialContractFiles) {
    requireText(relativePath, content, scrollGlassRule);
}

const fontStackRule = "GNU FreeMono remains the default and every selectable UI face falls back through the GNU FreeFont stack.";
const mapleCjkRule = "Explicitly marked Chinese, Japanese, and Korean text uses Maple Mono first.";
const googleAuthRule = "The public authentication surface is Google-only: `/login` exposes one Continue with Google button, and registration/password-reset routes redirect there.";
const openMojiRule = "All app-authored emoji must use pinned, production-ready OpenMoji color SVGs; do not rely on platform-native emoji glyphs.";
for (const [relativePath, content] of editorialContractFiles) {
    requireText(relativePath, content, fontStackRule);
    requireText(relativePath, content, mapleCjkRule);
    requireText(relativePath, content, googleAuthRule);
    requireText(relativePath, content, openMojiRule);
}

requireText("CLAUDE.md", claude, "@README.md");
requireText("CLAUDE.md", claude, "@AGENTS.md");
requireText("GEMINI.md", gemini, "The Novesce UI mandate is an always-on project requirement");
requireText(".cursor/rules/novesce-design.mdc", cursorRule, "alwaysApply: true");
requireText(".cursor/rules/novesce-design.mdc", cursorRule, "globs: \"**/*\"");
requireText(".github/copilot-instructions.md", copilot, "Repository-wide mandatory instructions");
requireText(".github/copilot-instructions.md", copilot, "The Novesce UI mandate applies to every task");

requireText("src/lib/themes.js", themes, "key: \"gnu-free-mono\"");
requireText("src/lib/themes.js", themes, "gnu-free-mono-v2");
requireText("src/lib/themes.js", themes, "function withGnuFallbacks");
requireText("src/lib/themes.js", themes, "const cjkFallback = \"'Maple Mono NF CN'");
requireText("src/lib/themes.js", themes, "root.style.setProperty(\"--font-cjk\", cjkFallback)");
requireText("src/index.css", css, "--font-body: 'GNUFreeMonoUI', 'GNUFreeSansUI', 'GNUFreeSerifUI'");
requireText("src/index.css", css, "--font-cjk: 'Maple Mono NF CN'");
requireText("src/index.css", css, ":lang(ko)");
requireText("src/index.css", css, "unicode-range: U+0E00-0E7F");
requireText("src/components/CjkFontLoader.jsx", cjkFontLoader, "https://fontsapi.zeoseven.com/442/main/result.css");
requireText("src/components/CjkFontLoader.jsx", cjkFontLoader, "MutationObserver");
requireText("src/pages/Login.jsx", login, 'base44.auth.loginWithProvider("google", "/home")');
requireText("src/pages/Login.jsx", login, "CONTINUE WITH GOOGLE");
forbidText("src/pages/Login.jsx", login, "loginViaEmailPassword");
forbidText("src/pages/Login.jsx", login, "<form");
requireText("src/App.jsx", app, ['<Route path="/register" element={<Navigate to="/login" replace />} />', '<Route path="/register" component={RedirectToLogin} />']);
requireText("src/App.jsx", app, ['<Route path="/forgot-password" element={<Navigate to="/login" replace />} />', '<Route path="/forgot-password" component={RedirectToLogin} />']);
requireText("src/App.jsx", app, ['<Route path="/reset-password" element={<Navigate to="/login" replace />} />', '<Route path="/reset-password" component={RedirectToLogin} />']);
forbidText("src/lib/routeLoaders.js", routeLoaders, 'import("@/pages/Register")');
forbidText("src/lib/routeLoaders.js", routeLoaders, 'import("@/pages/ForgotPassword")');
forbidText("src/lib/routeLoaders.js", routeLoaders, 'import("@/pages/ResetPassword")');
requireText("src/components/OpenMoji.jsx", openMoji, 'OPENMOJI_VERSION = "17.0.0"');
requireText("src/components/OpenMoji.jsx", openMoji, ['aria-hidden={label ? undefined : true}', 'aria-hidden={props.label ? undefined : true}']);
// The two Team.jsx assertions that used to sit here were removed when the
// unrouted pages (Team, Dashboard, Meetings, Topics, JobWheel, Register,
// ForgotPassword, ResetPassword) were deleted as dead code. They only pinned
// ONE call site of OpenMoji; the principle itself is still enforced, and more
// broadly, by the component contract above, the pinned-asset existence check
// below, and the repo-wide ban on platform-native emoji glyphs.
requireText("public/openmoji/LICENSE.txt", openMojiLicense, "Attribution-ShareAlike 4.0 International");

const openMojiAssets = ["1F331", "2694", "1F6E1", "1F3C5", "1F451", "1F525", "1F3B0", "1F3AF", "1F389", "1F3C6", "1F947", "1F948", "1F949", "26A1", "2705", "23F3"];
for (const hexcode of openMojiAssets) {
    const assetPath = `public/openmoji/17.0.0/${hexcode}.svg`;
    if (!fs.existsSync(path.join(root, assetPath))) failures.push(`Missing pinned OpenMoji asset: ${assetPath}`);
}

const nativeEmojiPattern = /\p{Extended_Pictographic}/u;
for (const sourceFile of listSourceFiles("src").filter((file) => /\.(?:js|jsx|ts|tsx)$/.test(file))) {
    const source = fs.readFileSync(path.join(root, sourceFile), "utf8");
    if (nativeEmojiPattern.test(source)) {
        failures.push(`${sourceFile} contains a platform-native emoji glyph; use OpenMoji.jsx with a pinned SVG asset`);
    }
}

requireText("src/styles/editorial-home.css", editorialHomeCss, ".editorial-home .mabis-widget-header");
requireText("src/main.jsx", main, ["import '@/styles/editorial-home.css'", 'import "@/styles/editorial-home.css"']);
requireText("src/pages/Home.jsx", home, ['className="editorial-home min-h-screen', 'class="editorial-home min-h-screen']);
requireText("src/lib/cursor-preference.js", cursorPreference, "mabis_custom_cursor_enabled");
requireText("src/lib/color/themeBalance.js", themeBalance, "contrastSafePair");
requireText("src/lib/color/themeBalance.js", themeBalance, "contrastSafeInk");
requireText("src/lib/color/themeBalance.js", themeBalance, "spreadBalancedPalette");
requireText("src/lib/themes.js", themes, "--editor-ink-primary");
requireText("src/index.css", css, ".theme-rich-text");
requireText("src/components/DocsEditor.jsx", docsEditor, "THEME_TEXT_COLORS");
requireText("src/components/DocsEditor.jsx", docsEditor, "THEME_HIGHLIGHTS");
forbidText("src/components/DocsEditor.jsx", docsEditor, 'type="color"');
requireText("src/components/JobsWidget.jsx", jobsWidget, 'label: "Time Keeper (1)", period: "monthly"');
requireText("src/components/JobsWidget.jsx", jobsWidget, "JobDefinition.create");
requireText("src/lib/jobsRotation.js", jobsRotation, "timeKeeperKeysForYear");
requireText("src/components/home/HomeSectionIndex.jsx", homeSectionIndex, "Choose where to go");
requireText("src/components/QuickStartGuide.jsx", quickStartGuide, "How to use this site");
requireText("src/components/JapaneseText.jsx", japaneseText, 'lang="ja"');
requireText("src/lib/japanese-text-preference.js", japanesePreference, 'mabis-japanese-text-enabled');
requireText("src/lib/japanese-text-preference.js", japanesePreference, '=== "true"');
requireText("src/components/SettingsModal.jsx", settingsModal, "SIMPLE_FONT_KEYS");
requireText("src/components/SettingsModal.jsx", settingsModal, "Advanced font choices");
requireText("src/components/ThemeSwitcher.jsx", themeSwitcher, "SIMPLE_THEME_KEYS");
requireText("src/components/ThemeSwitcher.jsx", themeSwitcher, "Browse all themes");
requireText("src/components/home/ScrollScaleRitual.jsx", scrollScaleRitual, "VOICE YOUR WORDS");
forbidText("src/components/home/ScrollScaleRitual.jsx", scrollScaleRitual, "A WEEKLY RITUAL");
requireText("src/pages/Home.jsx", home, "<HomeSectionIndex />");
requireText("src/pages/Home.jsx", home, "<QuickStartGuide open");
requireText("scripts/check-theme-balance.mjs", themeBalanceCheck, "Theme balance:");
requireText("package.json", packageJson, "npm run check:design && npm run check:themes && npm run check:performance");
requireText("package.json", packageJson, '"check:jobs": "node scripts/check-jobs-contract.mjs"');
requireText("package.json", packageJson, "node scripts/check-bundle-budget.mjs");
requireText("scripts/check-performance-contract.mjs", performanceContract, "React performance contract:");
requireText("scripts/check-bundle-budget.mjs", bundleBudget, "Bundle budgets passed:");

if (failures.length > 0) {
    console.error("\nNovesce design-contract check failed:\n");
    for (const failure of failures) {
        console.error(`- ${failure}`);
    }
    console.error("\nRestore the contract or update README.md, every AI instruction file, and this guard together after an explicit Novesce request.\n");
    process.exit(1);
}

console.log("Novesce design contract: enforced and intact.");
