import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Loader2, ArrowUpRight } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import FamicomController from "@/components/FamicomController";
import { enableHackerMode } from "@/lib/hacker";

const LOGO = "https://media.base44.com/images/public/6a2fcc3f4fec7200fed7a889/b6064da4f_MabisLogo-800x800.png";

export default function Login() {
  const [emailPrefix, setEmailPrefix] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const fullEmail = emailPrefix.trim().includes("@") ? emailPrefix.trim() : `${emailPrefix.trim()}@montessoribkk.com`;
      await base44.auth.loginViaEmailPassword(fullEmail, password);
      window.location.href = "/home";
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", "/home");
  };

  return (
    <AuthLayout
      logo={<img src={LOGO} alt="MABIS" className="w-12 h-12 object-contain" />}
      title="Log in"
      titleJp="ログイン"
      subtitle="／ authenticate to enter the community meeting"
      subtitleJp="／ コミュニティ・ミーティングへの認証"
      footerJp="アカウントをお持ちでない方はご登録ください"
      footer={
        <>
          NO ACCOUNT?{" "}
          <Link to="/register" className="text-primary ul-grow">CREATE ONE</Link>
        </>
      }
    >
      <button
        type="button"
        onClick={handleGoogle}
        data-cursor="GOOGLE"
        className="group w-full h-12 flex items-center justify-center gap-2 border border-foreground/20 bg-card text-xs tech-label text-foreground hover:bg-foreground hover:text-bone transition-colors mb-6"
      >
        <GoogleIcon className="w-4 h-4" />
        CONTINUE WITH GOOGLE <span lang="ja" className="font-jp normal-case tracking-normal">Googleで続ける</span>
      </button>

      <div className="relative mb-6 flex items-center">
        <div className="h-px flex-1 bg-foreground/15" />
        <span className="px-3 tech-label text-muted-foreground">OR <span lang="ja" className="font-jp normal-case tracking-normal">または</span></span>
        <div className="h-px flex-1 bg-foreground/15" />
      </div>

      {error && (
        <div className="mb-4 p-3 border border-destructive/40 bg-destructive/10 text-destructive text-xs tech-label">
          ／ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="tech-label text-muted-foreground">EMAIL ／ N°01 <span lang="ja" className="font-jp normal-case tracking-normal">メールアドレス</span></Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="text"
              autoComplete="email"
              autoFocus
              placeholder="you"
              value={emailPrefix}
              onChange={(e) => setEmailPrefix(e.target.value)}
              className="pl-10 pr-[160px] h-12 border-foreground/20 bg-transparent"
              required
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none select-none">@montessoribkk.com</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="tech-label text-muted-foreground">PASSWORD ／ N°02 <span lang="ja" className="font-jp normal-case tracking-normal">パスワード</span></Label>
            <Link to="/forgot-password" className="tech-label text-primary ul-grow">RESET? <span lang="ja" className="font-jp normal-case tracking-normal">再設定</span></Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12 border-foreground/20 bg-transparent"
              required
            />
          </div>
        </div>
        <Button
          type="submit"
          data-cursor="ENTER"
          className="group w-full h-12 tech-label bg-foreground text-bone hover:bg-primary hover:text-primary-foreground transition-colors"
          disabled={loading}
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> AUTHENTICATING… <span lang="ja" className="font-jp normal-case tracking-normal ml-1">認証中</span></>
          ) : (
            <span className="flex items-center gap-2">LOG IN <span lang="ja" className="font-jp normal-case tracking-normal">ログイン</span> <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span>
          )}
        </Button>
      </form>

      <FamicomController onUnlock={() => { enableHackerMode(); window.location.href = "/home"; }} />
    </AuthLayout>
  );
}