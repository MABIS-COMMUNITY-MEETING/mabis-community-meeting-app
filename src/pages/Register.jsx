import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Lock, Loader2 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import JapaneseText from "@/components/JapaneseText";
import { toast } from "@/components/ui/use-toast";
import { disableHackerMode } from "@/lib/hacker";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      disableHackerMode();
      await base44.auth.register({ email, password });
      setShowOtp(true);
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode });
      if (result?.access_token) {
        base44.auth.setToken(result.access_token);
      }
      window.location.href = "/home";
    } catch (err) {
      setError(err.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await base44.auth.resendOtp(email);
      toast({
        title: "Code sent",
        description: "Check your email for the new code.",
      });
    } catch (err) {
      setError(err.message || "Failed to resend code");
    }
  };

  const handleGoogle = () => {
    if (googleLoading) return;
    setError("");
    setGoogleLoading(true);
    disableHackerMode();

    try {
      base44.auth.loginWithProvider("google", "/home");
      window.setTimeout(() => setGoogleLoading(false), 15000);
    } catch (err) {
      setGoogleLoading(false);
      setError(err.message || "Google sign-in could not start. Please try again.");
    }
  };

  if (showOtp) {
    return (
      <AuthLayout
        icon={Mail}
        title="Verify your email"
        jaTitle="メールアドレスを確認"
        subtitle={`We sent a code to ${email}`}
      >
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}
        <div className="flex justify-center mb-6">
          <InputOTP
            maxLength={6}
            value={otpCode}
            onChange={setOtpCode}
            autoFocus
            autoComplete="one-time-code"
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button
          className="w-full h-12 font-medium"
          onClick={handleVerify}
          disabled={loading || otpCode.length < 6}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              <JapaneseText ja="確認中..." layout="inline" japaneseClassName="text-[0.85em]">Verifying...</JapaneseText>
            </>
          ) : (
            <JapaneseText ja="確認する" layout="inline" japaneseClassName="text-[0.85em]">Verify</JapaneseText>
          )}
        </Button>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Didn't receive the code? <span lang="ja" className="text-xs">コードが届きませんか？</span>{" "}
          <button onClick={handleResend} className="text-primary font-medium hover:underline">
            <JapaneseText ja="再送信" layout="inline" japaneseClassName="text-[0.85em]">Resend</JapaneseText>
          </button>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={UserPlus}
      title="Create your account"
      jaTitle="アカウントを作成"
      subtitle="Sign up to get started"
      jaSubtitle="登録して始めましょう"
      footer={
        <>
          Already have an account? <span lang="ja" className="text-[0.9em]">すでにアカウントをお持ちですか？</span>{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <Button
        variant="outline"
        className="w-full h-12 text-sm font-medium mb-6 disabled:cursor-wait disabled:opacity-70"
        onClick={handleGoogle}
        disabled={googleLoading || loading}
        aria-busy={googleLoading}
      >
        {googleLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <GoogleIcon className="w-5 h-5 mr-2" />}
        <JapaneseText ja={googleLoading ? "Googleに接続中…" : "Googleで続行"} layout="inline" japaneseClassName="text-[0.85em]">{googleLoading ? "Connecting to Google…" : "Continue with Google"}</JapaneseText>
      </Button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">or <span lang="ja" className="normal-case">または</span></span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email"><JapaneseText ja="メールアドレス" japaneseClassName="text-[0.85em]">Email</JapaneseText></Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password"><JapaneseText ja="パスワード" japaneseClassName="text-[0.85em]">Password</JapaneseText></Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm"><JapaneseText ja="パスワードを確認" japaneseClassName="text-[0.85em]">Confirm Password</JapaneseText></Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              <JapaneseText ja="アカウントを作成中..." layout="inline" japaneseClassName="text-[0.85em]">Creating account...</JapaneseText>
            </>
          ) : (
            <JapaneseText ja="アカウントを作成" layout="inline" japaneseClassName="text-[0.85em]">Create account</JapaneseText>
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}