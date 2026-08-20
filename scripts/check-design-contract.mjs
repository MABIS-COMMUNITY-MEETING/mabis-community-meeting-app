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
    "src/components/home/LazySection.jsx": ["solid/components/home/LazySection.jsx", "solid/lib/perf.js"],
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
const glassCss = read("src/styles/glass.css");
const prefsSync = read("src/components/PrefsSync.jsx");
const pageChrome = read("src/components/page-chrome.jsx");
const home = read("src/pages/Home.jsx");
const cursorPreference = read("src/lib/cursor-preference.js");
const themeBalance = read("src/lib/color/themeBalance.js");
const themeBalanceCheck = read("scripts/check-theme-balance.mjs");
const packageJson = read("package.json");
const performanceContract = read("scripts/check-performance-contract.mjs");
const bundleBudget = read("scripts/check-bundle-budget.mjs");
const cjkFontLoader = read("src/components/CjkFontLoader.jsx");
/*
 * The LIVE sign-in page, named explicitly rather than through the src/→solid/
 * fallback.
 *
 * On 2026-08-17 `base44-builder[bot]` committed "chore: add boilerplate auth
 * templates", recreating src/pages/{Login,Register,ForgotPassword,
 * ResetPassword,OAuthConsent}.jsx and src/components/ProtectedRoute.jsx. That
 * boilerplate carries an email/password <form>, which this contract forbids —
 * and because the path resolver prefers src/, the Google-only rules below
 * silently switched from checking the page users actually see to checking
 * platform scaffolding nothing imports. The build failed, which is the right
 * outcome, but for the wrong reason.
 *
 * The boilerplate is dead: solid/App.jsx routes /login to the Solid page and
 * redirects /register, /forgot-password and /reset-password to it. So the
 * rules are asserted against the live page, and the guard below keeps the
 * boilerplate unreachable rather than trusting it to stay that way.
 */
const login = read("solid/pages/Login.jsx");
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
const easyLayoutRule = "Keep Home easy to navigate: the default layout stacks the widgets as the original MABIS interface did, and the Boss style adds numbered editorial sections with a plain-language page guide; usability aids must clarify whichever layout is in use rather than bolt a generic dashboard onto either one.";
const japaneseTextRule = "Japanese companion text is opt-in, shown alongside—not instead of—the English interface, stored per user, and marked with `lang=\"ja\"` so Maple Mono CJK fallback applies; the default remains off.";
const simpleCustomizationRule = "Customization surfaces show a small set of plain-language default choices first, with the large font catalogue and the custom Material You tools behind clearly labeled advanced controls. The standard colour catalogue shows MABIS only; the large LGBTQ+, BFDI, Touhou, Linux, game, and other themed palette catalogue unlocks only after the same person activates the Boss style control 69 times, with no account or email bypass. `getSelectableThemeKeys()` in `src/lib/themes.js` is the single source of truth and no picker surface may enumerate `THEMES` directly. The wallpaper/photo Material You theme builder remains available to everyone without that unlock or manual primary/secondary colour fields.";
const jobsPeriodRule = "Built-in jobs remain weekly except Time Keepers, who serve monthly and cannot be selected again in the same calendar year; custom jobs may choose weekly or monthly periods.";
const homeLayoutRule = "The app has two styles, chosen in Settings and applied everywhere — Home, the splash, login and the archive pages. `Summer style` is the default and must ALWAYS stick to the style Summer wants — the original MABIS interface, as built in app `6a7f1d91128253fcdbf4f5a2`, which is the reference for it: the original top bar, rounded white cards, coloured widget headers, no editorial scaffolding. Match that site; do not improve it, modernise it, tidy it, or drift it toward the editorial system or an AI's taste. An editorial flourish added to a Summer surface — an N° caption, tracked-out display type, a ruled plane, a square radius — is a bug exactly as a missing widget is. Summer style is the ONLY sanctioned exception to the Novesce UI mandate, and it is an exception to the editorial system alone, never to the tokens, fonts, OpenMoji, Google-only auth, cursor, glass or performance rules. `Boss style` is opt-in and must ALWAYS follow the Novesce design philosophy in full: the Japanese editorial system — numbered sections, tracked-out display type, ruled neutral planes, N° captions, restrained radii, the glass control plane — built from semantic tokens, the GNU FreeMono stack with Maple Mono for CJK, and pinned OpenMoji. A Boss surface that is not editorial, or that reaches for a generic dashboard look, is a bug. Every feature, widget, page, control and fix must exist in BOTH styles; adding something to one and not the other is a bug, not a variant. They are two presentations of one product, not two products.";
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
const bossHome = read("solid/components/home/boss.jsx");
const layoutPreference = read("src/lib/layout-preference.js");
requireText("src/lib/layout-preference.js", layoutPreference, 'DEFAULT_HOME_LAYOUT = "simple"');
requireText("src/lib/layout-preference.js", layoutPreference, 'HOME_LAYOUTS = ["simple", "boss"]');
requireText("src/pages/Home.jsx", home, ["const isBoss = () => layout() === \"boss\""]);
requireText("src/components/SettingsModal.jsx", settingsModal, "Boss style");

/* The editorial layer must stay gated, or the default layout silently becomes
   the editorial one again — flat cards, 2px radii, no elevation. */
requireText("src/styles/editorial-home.css", editorialHomeCss, "html.home-layout-boss .editorial-home .mabis-widget");
forbidText("src/styles/editorial-home.css", editorialHomeCss, "\n.editorial-home ");

/* One widget render path for both layouts. Two would drift. */
requireText("src/pages/Home.jsx", home, "const renderWidget = (s) =>");

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

const fontStackRule = "GNU FreeMono remains the default and every selectable UI face falls back through the GNU FreeFont stack; the pinned OpenMoji emoji font leads every stack but is scoped by `unicode-range` to emoji codepoints alone, so it never renders text.";
const mapleCjkRule = "Explicitly marked Chinese, Japanese, and Korean text uses Maple Mono ahead of every other text face; only the emoji-scoped OpenMoji family may precede it in a stack, and that family covers no CJK codepoint.";
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
requireText("src/lib/themes.js", themes, "'Maple Mono NF CN', 'Maple Mono CN', 'Maple Mono'");

/*
 * OpenMoji is the emoji font, and nothing else may render an emoji.
 *
 * Pinned SVGs via OpenMoji.jsx cover app-authored glyphs, but emoji people
 * TYPE — announcements, news, minutes, topic titles, all rendered as user HTML
 * through innerHTML — have no component to route through. Without a font
 * leading the stack they fall to Apple Color Emoji / Segoe / Noto, which is
 * exactly what the contract forbids and is invisible to every other check
 * here: no build failure, no markup change, just different glyphs per device.
 *
 * Both halves are pinned because either alone is useless. The @font-face
 * without the stack prefix is a font nothing selects; the prefix without the
 * @font-face is a family that does not resolve. The unicode-range is pinned
 * too — dropping it would let a 2.63 MiB emoji font try to render ordinary
 * text and pull itself onto the critical path.
 */
/*
 * Material theme creation is a direct, public path.
 *
 * Keep the advanced disclosure because it prevents the easy catalogue from
 * becoming dense, but never hide it behind account identity or a secret
 * gesture. New personal themes come from the full Material seed pipeline;
 * the retired two-colour inputs must not return.
 */
requireText("src/components/ThemeSwitcher.jsx", themeSwitcher, "WallpaperColorPicker");
requireText("src/components/ThemeSwitcher.jsx", themeSwitcher, "saveMaterialTheme");
requireText("src/components/ThemeSwitcher.jsx", themeSwitcher, "Create a Material theme · Advanced");
requireText("src/components/ThemeSwitcher.jsx", themeSwitcher, "disabled={!themeName().trim() || !materialSeedActive()}");
forbidText("src/components/ThemeSwitcher.jsx", themeSwitcher, 'type="color"');
forbidText("src/components/ThemeSwitcher.jsx", themeSwitcher, "canUseCustomColors");
forbidText("src/components/PrefsSync.jsx", prefsSync, "canUseCustomColors");
forbidText("src/components/page-chrome.jsx", pageChrome, "onLogoClick");
forbidText("solid/components/home/boss.jsx", bossHome, "UNLOCK_TAPS");
forbidText("solid/components/home/boss.jsx", bossHome, "onLogoClick");

/*
 * The large themed palette catalogue is a deliberate Boss-style easter egg.
 *
 * MABIS stays the only standard palette. The unlock is persistent and reactive,
 * but it has no identity-based bypass: every person reaches the catalogue
 * through the same 69 activations of the real Boss style button.
 */
requireText("src/components/SettingsModal.jsx", settingsModal, "const BOSS_THEME_UNLOCK_PRESSES = 69;");
requireText("src/components/SettingsModal.jsx", settingsModal, "nextPressCount === BOSS_THEME_UNLOCK_PRESSES");
requireText("src/components/SettingsModal.jsx", settingsModal, "unlockBossThemesLocally()");
requireText("src/components/ThemeSwitcher.jsx", themeSwitcher, "getSelectableThemeKeys()");
requireText("src/components/ThemeSwitcher.jsx", themeSwitcher, "BOSS_THEMES_UNLOCKED_EVENT");
requireText("src/lib/themes.js", themes, 'const BOSS_THEMES_UNLOCK_KEY = "mabis-boss-themes-unlocked";');
requireText("src/lib/themes.js", themes, "return areBossThemesUnlockedLocally() ? Object.keys(THEMES) : SELECTABLE_THEME_KEYS;");
forbidText("src/lib/themes.js", themes, "SPECIAL_THEME_EMAIL");
forbidText("src/lib/themes.js", themes, "SPECIAL_THEME_USER_ID");

requireText("src/index.css", css, "font-family: 'OpenMojiColor'");
requireText("src/index.css", css, "unicode-range:");
requireText("src/lib/themes.js", themes, "const EMOJI_FAMILY = \"'OpenMojiColor'\"");
requireText("src/lib/themes.js", themes, "[EMOJI_FAMILY, ...selectedFamilies");
requireText("src/lib/themes.js", themes, "root.style.setProperty(\"--font-cjk\", cjkFallback)");
requireText("src/index.css", css, "--font-body: 'OpenMojiColor', 'GNUFreeMonoUI', 'GNUFreeSansUI', 'GNUFreeSerifUI'");
requireText("src/index.css", css, "--font-cjk: 'OpenMojiColor', 'Maple Mono NF CN'");
requireText("src/index.css", css, ":lang(ko)");
requireText("src/index.css", css, "unicode-range: U+0E00-0E7F");
requireText("src/components/CjkFontLoader.jsx", cjkFontLoader, "https://fontsapi.zeoseven.com/442/main/result.css");
requireText("src/components/CjkFontLoader.jsx", cjkFontLoader, "MutationObserver");
requireText("src/pages/Login.jsx", login, 'base44.auth.loginWithProvider("google", "/home")');
requireText("src/pages/Login.jsx", login, "CONTINUE WITH GOOGLE");
forbidText("src/pages/Login.jsx", login, "loginViaEmailPassword");
forbidText("solid/pages/Login.jsx", login, "<form");

/* The public auth surface stays Google-only however the platform scaffolds it:
   no router may mount the boilerplate, and the retired routes must keep
   redirecting rather than render a password form. */
for (const retired of ["Register", "ForgotPassword", "ResetPassword", "OAuthConsent"]) {
    forbidText("solid/App.jsx", app, `pages/${retired}`);
}
for (const retired of ["/register", "/forgot-password", "/reset-password"]) {
    requireText("solid/App.jsx", app, `<Route path="${retired}" component={RedirectToLogin} />`);
}
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

/*
 * No platform-native emoji glyph in app-authored source.
 *
 * This scanned `src/` only, which stopped being the UI when the Solid cutover
 * landed — every component a reader actually sees lives in `solid/`, and a
 * native emoji there shipped unguarded. Both trees are scanned now.
 *
 * Why it matters beyond consistency: an emoji codepoint in text is rendered by
 * the platform's own emoji font, which differs per OS and per version, ignores
 * the app's palette, and cannot be pinned. OpenMoji.jsx renders a pinned SVG
 * asset instead, so the glyph is identical everywhere and frozen at a version.
 */
const nativeEmojiPattern = /\p{Extended_Pictographic}/u;
const emojiScanRoots = ["solid", "src"].filter((dir) => fs.existsSync(path.join(root, dir)));
for (const sourceFile of emojiScanRoots.flatMap((dir) => listSourceFiles(dir)).filter((file) => /\.(?:js|jsx|ts|tsx)$/.test(file))) {
    const source = fs.readFileSync(path.join(root, sourceFile), "utf8");
    if (nativeEmojiPattern.test(source)) {
        failures.push(`${sourceFile} contains a platform-native emoji glyph; use OpenMoji.jsx with a pinned SVG asset`);
    }
}

/*
 * The site header must not form a backdrop root.
 *
 * The contract requires live glass backdrop blur on the floating control
 * plane. `isolation: isolate`, `filter`, `opacity` below 1 or a `mask` on the
 * header shell each form a backdrop root (Filter Effects), and a backdrop
 * filter samples nothing outside its own root — so the header renders its tint
 * and border with no blur at all.
 *
 * That failure is invisible to everything else here: the build passes, the
 * markup is unchanged, the computed styles all look right, and the bar just
 * quietly stops being glass. It shipped that way once already.
 *
 * The header's stacking context comes from `position: fixed` + `z-50`, which
 * is not a backdrop root, so nothing needs this to lay out correctly.
 */
{
  const backdropRootProps = /isolation\s*:\s*isolate|(^|;|\{)\s*filter\s*:|mix-blend-mode\s*:/;
  /* Both rules carry a comment explaining why the property must NOT be there,
     and that comment names the property. Strip comments first or the guard
     fires on the very note telling you not to reintroduce it. */
  const declarationsOnly = (rule) => rule.replace(/\/\*[\s\S]*?\*\//g, "");

  const shellRule = declarationsOnly(glassCss.match(/\.site-header-shell\s*\{[^}]*\}/g)?.join("\n") || "");
  if (backdropRootProps.test(shellRule)) {
    failures.push(
      "src/styles/glass.css: .site-header-shell forms a backdrop root — the top bar's glass will render transparent instead of blurred. See the note above that rule."
    );
  }

  /* The surface itself must not form one either. backdrop-filter already gives
     it a stacking context, so isolation/filter/mix-blend-mode here buy nothing
     and cost the entire effect. */
  const surfaceRule = declarationsOnly(glassCss.match(/(^|\})\s*\.lg-surface\s*\{[^}]*\}/m)?.[0] || "");
  if (backdropRootProps.test(surfaceRule)) {
    failures.push(
      "src/styles/glass.css: .lg-surface forms its own backdrop root — it has no backdrop left to sample and will render tint and border with no blur."
    );
  }
}

requireText("src/styles/editorial-home.css", editorialHomeCss, ".editorial-home .mabis-widget-header");
/*
 * The editorial layer must be imported by the app — but not from any
 * particular file.
 *
 * This rule used to name the entry, which quietly forced a cost it was never
 * meant to impose: every rule in editorial-home.css is gated on
 * `html.home-layout-boss`, so importing it from the entry made the DEFAULT
 * layout download and parse a stylesheet it cannot match a single selector
 * of. Pinning the location is what made that unavoidable.
 *
 * What the contract actually protects is that the layer SHIPS — that nobody
 * quietly deletes the editorial normalization by dropping its import — and
 * that holds wherever the import lives. Scanning both trees keeps the rule
 * true if the file moves again, and lets the import sit with the layout that
 * needs it.
 */
const editorialImport = /import\s+["']@\/styles\/editorial-home\.css["']/;
const editorialImporters = ["solid", "src"]
    .filter((dir) => fs.existsSync(path.join(root, dir)))
    .flatMap((dir) => listSourceFiles(dir))
    .filter((file) => /\.(?:js|jsx|ts|tsx)$/.test(file))
    .filter((file) => editorialImport.test(fs.readFileSync(path.join(root, file), "utf8")));
if (editorialImporters.length === 0) {
    failures.push("No module imports '@/styles/editorial-home.css' — the Home editorial normalization would not ship at all");
}
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
/*
 * The picker must ask the central gate for its keys, not enumerate THEMES.
 *
 * THEMES holds the large hidden catalogue. Enumerating it in the surface would
 * bypass the 69-press Boss-style unlock, while a second hand-maintained list
 * would drift when palettes are added. Keep the gate in themes.js.
 */
requireText("src/components/ThemeSwitcher.jsx", themeSwitcher, "getSelectableThemeKeys()");
requireText("src/lib/themes.js", themes, "export const SELECTABLE_THEME_KEYS");
if (/Object\.entries\(THEMES\)|Object\.keys\(THEMES\)/.test(themeSwitcher)) {
  failures.push(
    "src/components/ThemeSwitcher.jsx enumerates THEMES directly — that bypasses the Boss-style unlock. Use getSelectableThemeKeys()."
  );
}
requireText("src/components/ThemeSwitcher.jsx", themeSwitcher, "Browse all themes");
requireText("src/components/home/ScrollScaleRitual.jsx", scrollScaleRitual, "VOICE YOUR WORDS");
forbidText("src/components/home/ScrollScaleRitual.jsx", scrollScaleRitual, "A WEEKLY RITUAL");
/* The page guide is the boss layout's navigation aid and moved into its chunk
   with the rest of the editorial furniture. The default layout deliberately
   has none — it is a single stack of cards, with nothing to jump between. */
requireText("solid/components/home/boss.jsx", bossHome, "<HomeSectionIndex />");
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
