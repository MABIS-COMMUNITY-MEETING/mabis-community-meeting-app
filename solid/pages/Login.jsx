import { createSignal, onCleanup, Show } from "solid-js";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-solid";
import AuthLayout from "~/components/AuthLayout";
import GoogleIcon from "~/components/GoogleIcon";
import { JapaneseText } from "~/components/primitives";
import { disableHackerMode } from "@/lib/hacker";
import { useHomeLayout } from "~/lib/prefs";

const LOGO = "https://media.base44.com/images/public/6a2fcc3f4fec7200fed7a889/b6064da4f_MabisLogo-800x800.png/v1/fill/w_144,h_144/logo.webp";

/**
 * Google sign-in — 1:1 port of src/pages/Login.jsx.
 *
 * The only structural change is timer ownership: React left the 15s re-enable
 * timeout dangling, which is harmless there because setState on an unmounted
 * component is a no-op. In Solid a signal write after disposal is a real leak,
 * so the handle is tracked and cleared in onCleanup.
 */
export default function Login() {
  const [error, setError] = createSignal("");
  const [googleLoading, setGoogleLoading] = createSignal(false);
  /* The shell switches with the style, so the one control on the page has to
     as well — a square tech-label button inside Summer's rounded card would
     read as a half-finished port. Same element, same handler, same states. */
  const layout = useHomeLayout();
  const boss = () => layout() === "boss";

  let retryTimer;
  onCleanup(() => clearTimeout(retryTimer));

  const handleGoogle = () => {
    if (googleLoading()) return;
    setError("");
    setGoogleLoading(true);
    disableHackerMode();

    try {
      // This call must stay synchronous with the user's click so browsers allow
      // Base44's OAuth popup when the app is running inside an editor iframe.
      base44.auth.loginWithProvider("google", "/home");
      // If a popup is blocked or closed, allow a deliberate retry without
      // encouraging the rapid second click that used to create overlapping flows.
      clearTimeout(retryTimer);
      retryTimer = window.setTimeout(() => setGoogleLoading(false), 15000);
    } catch (err) {
      setGoogleLoading(false);
      setError(err.message || "Google sign-in could not start. Please try again.");
    }
  };

  return (
    <AuthLayout
      logo={<img src={LOGO} alt="MABIS" class="w-12 h-12 object-contain" />}
      title="Sign in"
      jaTitle="サインイン"
      subtitle="Continue with your MABIS Google account"
      jaSubtitle="MABISのGoogleアカウントで続行"
    >
      <Show when={error()}>
        <div
          role="alert"
          class={
            boss()
              ? "mb-4 border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive tech-label"
              : "mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          }
        >
          {error()}
        </div>
      </Show>

      <button
        type="button"
        onClick={handleGoogle}
        data-cursor="GOOGLE"
        disabled={googleLoading()}
        aria-busy={googleLoading()}
        class={
          boss()
            ? "group flex h-12 w-full items-center justify-center gap-2 border border-foreground/20 bg-card text-xs text-foreground tech-label transition-colors hover:bg-foreground hover:text-bone disabled:cursor-wait disabled:opacity-70"
            : "group flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted disabled:cursor-wait disabled:opacity-70"
        }
      >
        <Show when={googleLoading()} fallback={<GoogleIcon class="h-4 w-4" />}>
          <Loader2 class="h-4 w-4 animate-spin" />
        </Show>
        <JapaneseText
          ja={googleLoading() ? "Googleに接続中…" : "Googleで続行"}
          layout="inline"
          japaneseClass="text-[0.8em]"
        >
          <Show
            when={boss()}
            fallback={googleLoading() ? "Connecting to Google…" : "Continue with Google"}
          >
            {googleLoading() ? "CONNECTING TO GOOGLE…" : "CONTINUE WITH GOOGLE"}
          </Show>
        </JapaneseText>
      </button>
    </AuthLayout>
  );
}
