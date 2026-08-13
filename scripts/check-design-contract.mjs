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
const cursorPreference = read("src/lib/cursor-preference.js");
const themeBalance = read("src/lib/color/themeBalance.js");
const themeBalanceCheck = read("scripts/check-theme-balance.mjs");
const packageJson = read("package.json");

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
requireText("src/lib/cursor-preference.js", cursorPreference, "mabis_custom_cursor_enabled");
requireText("src/lib/color/themeBalance.js", themeBalance, "contrastSafePair");
requireText("src/lib/color/themeBalance.js", themeBalance, "spreadBalancedPalette");
requireText("scripts/check-theme-balance.mjs", themeBalanceCheck, "Theme balance:");
requireText("package.json", packageJson, "npm run check:design && npm run check:themes");

if (failures.length > 0) {
    console.error("\nNovesce design-contract check failed:\n");
    for (const failure of failures) {
        console.error(`- ${failure}`);
    }
    console.error("\nRestore the contract or update README.md, every AI instruction file, and this guard together after an explicit Novesce request.\n");
    process.exit(1);
}

console.log("Novesce design contract: enforced and intact.");
