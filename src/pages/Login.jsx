import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { disableHackerMode } from "@/lib/hacker";

const LOGO = "https://media.base44.com/images/public/6a2fcc3f4fec7200fed7a889/b6064da4f_MabisLogo-800x800.png";

export default function Login() {
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogle = () => {
    if (googleLoading) return;
    setError("");
    setGoogleLoading(true);
    disableHackerMode();

    try {
      // This call must stay synchronous with the user's click so browsers allow
      // Base44's OAuth popup when the app is running inside an editor iframe.
      base44.auth.loginWithProvider("google", "/home");
      // If a popup is blocked or closed, allow a deliberate retry without
      // encouraging the rapid second click that used to create overlapping flows.
      window.setTimeout(() => setGoogleLoading(false), 15000);
    } catch (err) {
      setGoogleLoading(false);
      setError(err.message || "Google sign-in could not start. Please try again.");
    }
  };

  return (
    <AuthLayout
      logo={<img src={LOGO} alt="MABIS" className="w-12 h-12 object-contain" />}
      title="Sign in"
      subtitle="Continue with your MABIS Google account"
    >
      {error && (
        <div
          role="alert"
          className="mb-4 border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive tech-label"
        >
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleGoogle}
        data-cursor="GOOGLE"
        disabled={googleLoading}
        aria-busy={googleLoading}
        className="group flex h-12 w-full items-center justify-center gap-2 border border-foreground/20 bg-card text-xs text-foreground tech-label transition-colors hover:bg-foreground hover:text-bone disabled:cursor-wait disabled:opacity-70"
      >
        {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon className="h-4 w-4" />}
        {googleLoading ? "CONNECTING TO GOOGLE…" : "CONTINUE WITH GOOGLE"}
      </button>
    </AuthLayout>
  );
}