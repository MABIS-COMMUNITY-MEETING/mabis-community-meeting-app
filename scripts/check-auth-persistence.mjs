/**
 * The signed-in session must survive a reload.
 *
 * This exists because of a bug that made the app ask for Google sign-in on
 * every single visit, and that no other check could have caught: it was not a
 * compile error, not a render difference, and not visible until you had signed
 * out once. See the comment on getUrlOnlyParamValue in src/lib/app-params.js.
 *
 * The short version: clear_access_token is a one-shot COMMAND from the sign-out
 * redirect, but it was read through getAppParamValue(), which persists every
 * value it sees and replays it from localStorage on later loads. So the first
 * sign-out armed a permanent "delete the session" flag.
 *
 * Rather than assert on the source text, this drives the real module through
 * the four-step lifecycle in a DOM and checks the token that comes out.
 *
 * Run: node scripts/check-auth-persistence.mjs
 */
import fs from "node:fs";
import { JSDOM } from "jsdom";
import { isMabisSchoolEmail } from "../src/lib/school-email.js";

const failures = [];
const checks = [];

function check(name, condition, detail = "") {
  checks.push(name);
  if (!condition) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

/* import.meta.env is Vite-only, and this module is otherwise dependency-free,
   so it can be evaluated directly instead of built first. */
const source = fs.readFileSync("src/lib/app-params.js", "utf8")
  .replace(/import\.meta\.env\.\w+/g, "undefined")
  .replace(/export const/g, "const");

function loadAppParams({ url, storage = {} }) {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url });
  const { window } = dom;
  for (const [key, value] of Object.entries(storage)) window.localStorage.setItem(key, value);

  const evaluate = new Function("window", "document", `${source}; return appParams;`);
  const params = evaluate(window, window.document);
  return { params, storage: window.localStorage, url: window.location.href };
}

const TOKEN = "token-from-google";

check("the school domain is accepted", isMabisSchoolEmail("student@montessoribkk.com"));
check("domain matching is case-insensitive", isMabisSchoolEmail("Teacher@MONTESSORIBKK.COM"));
check("surrounding whitespace is harmless", isMabisSchoolEmail("  parent@montessoribkk.com  "));
check("personal Google accounts are rejected", !isMabisSchoolEmail("student@gmail.com"));
check("lookalike suffixes are rejected", !isMabisSchoolEmail("student@montessoribkk.com.example"));
check("subdomains are rejected", !isMabisSchoolEmail("student@mail.montessoribkk.com"));
check("missing local parts are rejected", !isMabisSchoolEmail("@montessoribkk.com"));

const authContextSource = fs.readFileSync("solid/lib/AuthContext.jsx", "utf8");
const domainChecks = authContextSource.match(/isMabisSchoolEmail\(/g) || [];
check("online, cached, and refreshed users are domain-checked", domainChecks.length >= 3);
check("the local hacker identity cannot authenticate",
  !/\bHACKER_USER\b|\bisHackerMode\s*\(/.test(authContextSource));

const authConfig = JSON.parse(fs.readFileSync("base44/auth/config.jsonc", "utf8"));
check("Google is enabled", authConfig.enableGoogleLogin === true);
check("password login is disabled", authConfig.enableUsernamePassword === false);
check("other social providers are disabled",
  authConfig.enableMicrosoftLogin === false
    && authConfig.enableFacebookLogin === false
    && authConfig.enableAppleLogin === false
    && authConfig.enableSSOLogin === false);

const projectConfig = fs.readFileSync("base44/config.jsonc", "utf8");
check("the Base44 app is declared private", /\"visibility\"\s*:\s*\"private\"/.test(projectConfig));

// 1. Sign-in: Base44 returns from the provider with the token in the URL.
const signIn = loadAppParams({ url: `https://app.test/home?access_token=${TOKEN}` });
check("sign-in reads the token from the redirect", signIn.params.token === TOKEN);
check("sign-in persists the token", signIn.storage.getItem("base44_access_token") === TOKEN);
check("the token is stripped from the address bar", !signIn.url.includes("access_token"));

// 2. Ordinary revisit: no parameters, session restored from storage.
const revisit = loadAppParams({
  url: "https://app.test/home",
  storage: { base44_access_token: TOKEN },
});
check("a plain revisit restores the session", revisit.params.token === TOKEN);

// 3. Sign-out: the redirect carries the one-shot clear command.
const signOut = loadAppParams({
  url: "https://app.test/?clear_access_token=true",
  storage: { base44_access_token: TOKEN },
});
check("sign-out clears the token", signOut.params.token === null);
check("sign-out does not persist the clear command",
  signOut.storage.getItem("base44_clear_access_token") === null,
  "a stored flag replays on every later load and deletes the next session");

// 4. The regression itself: sign in again after a sign-out, then reload.
const afterSignOut = loadAppParams({
  url: `https://app.test/home?access_token=${TOKEN}`,
  storage: { base44_clear_access_token: "true" },
});
check("signing in again after a sign-out works", afterSignOut.params.token === TOKEN);
check("a stale clear flag from an older build is repaired",
  afterSignOut.storage.getItem("base44_clear_access_token") === null);

const reload = loadAppParams({
  url: "https://app.test/home",
  storage: { base44_access_token: TOKEN, base44_clear_access_token: "true" },
});
check("the session survives a reload after a previous sign-out",
  reload.params.token === TOKEN,
  "this is the \"it asks me to log in every visit\" bug");

console.log(`\nAuth persistence: ${checks.length - failures.length}/${checks.length} checks passed\n`);
if (failures.length) {
  console.error("FAILED:");
  failures.forEach((f) => console.error(`  - ${f}`));
  process.exit(1);
}
console.log("Auth is Google-only, school-domain restricted, private, and reload-safe.\n");
