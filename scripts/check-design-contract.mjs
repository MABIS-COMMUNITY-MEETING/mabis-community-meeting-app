import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
    const absolutePath = path.join(root, relativePath);
    if (!fs.existsSync(absolutePath)) {
        failures.push(`Missing mandatory file: ${relativePath}`);
        return "";
    }
    return fs.readFileSync(absolutePath, "utf8");
}

function requireText(relativePath, content, requiredText) {
    if (!content.includes(requiredText)) {
        failures.push(`${relativePath} must contain: ${requiredText}`);
    }
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

const readmeRules = [
    "## Mandatory rule for AI contributors",
    "## Novesce UI mandate",
    "research Japanese web design in depth before writing or editing any project code",
    "GNU FreeMono is the default UI font",
    "Thai falls back to the Thai-only **GNU FreeSerif** face",
    "Japanese and Chinese use **UnifontEX**",
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

requireText("CLAUDE.md", claude, "@README.md");
requireText("CLAUDE.md", claude, "@AGENTS.md");
requireText("GEMINI.md", gemini, "The Novesce UI mandate is an always-on project requirement");
requireText(".cursor/rules/novesce-design.mdc", cursorRule, "alwaysApply: true");
requireText(".cursor/rules/novesce-design.mdc", cursorRule, "globs: \"**/*\"");
requireText(".github/copilot-instructions.md", copilot, "Repository-wide mandatory instructions");
requireText(".github/copilot-instructions.md", copilot, "The Novesce UI mandate applies to every task");

requireText("src/lib/themes.js", themes, "key: \"gnu-free-mono\"");
requireText("src/lib/themes.js", themes, "gnu-free-mono-v1");
requireText("src/lib/themes.js", themes, "const thaiFallback = \"'GNUFreeSerifThai'\"");
requireText("src/lib/themes.js", themes, "root.style.setProperty(\"--font-multilingual\", \"'UnifontEX'\")");
requireText("src/index.css", css, "--font-body: 'GNUFreeMonoUI', 'GNUFreeSerifThai'");
requireText("src/index.css", css, "unicode-range: U+0E00-0E7F");
requireText("src/styles/editorial-home.css", editorialHomeCss, ".editorial-home .mabis-widget-header");
requireText("src/main.jsx", main, "import '@/styles/editorial-home.css'");
requireText("src/pages/Home.jsx", home, 'className="editorial-home min-h-screen');
requireText("src/lib/cursor-preference.js", cursorPreference, "mabis_custom_cursor_enabled");
requireText("src/lib/color/themeBalance.js", themeBalance, "contrastSafePair");
requireText("src/lib/color/themeBalance.js", themeBalance, "spreadBalancedPalette");
requireText("scripts/check-theme-balance.mjs", themeBalanceCheck, "Theme balance:");
requireText("package.json", packageJson, "npm run check:design && npm run check:themes && npm run check:performance");
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
