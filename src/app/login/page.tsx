"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, User, Lock, Loader2, Rocket, Zap, ArrowLeft, Crown, Sparkles } from "lucide-react";
import Link from "next/link";
import TurnstileWidget from "@/app/components/TurnstileWidget";
import { useLanguage } from "@/app/components/LanguageProvider";
import BrandMark from "@/app/components/BrandMark";
import { announceAuthChange } from "@/app/components/auth-client";

type AuthResponse = {
  error?: string;
  requires2fa?: boolean;
  user?: { username?: unknown; role?: unknown; balance?: unknown; emailVerified?: unknown };
};

async function readAuthResponse(response: Response): Promise<AuthResponse> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as AuthResponse;
  } catch {
    return { error: response.ok ? "وصلت استجابة غير صالحة من الخادم. أعد المحاولة." : "تعذر الاتصال بخادم المصادقة حاليًا. أعد المحاولة بعد لحظات." };
  }
}

function getSafeReturnPath() {
  if (typeof window === "undefined") return "/services";
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/services";
}

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const { t } = useLanguage();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileError, setTurnstileError] = useState("");
  const [website, setWebsite] = useState("");
  const [formStartedAt, setFormStartedAt] = useState(() => Date.now());
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<"checking" | "online" | "offline">("checking");
  const router = useRouter();
  const [returnPath] = useState(getSafeReturnPath);

  const setAuthMode = (nextIsLogin: boolean) => {
    setIsLogin(nextIsLogin);
    setEmail("");
    setPassword("");
    setTermsAccepted(false);
    setTurnstileToken("");
    setTurnstileError("");
    setWebsite("");
    setFormStartedAt(Date.now());
    setError("");
    setSuccess("");
    const nextQuery = returnPath !== "/services" ? `?next=${encodeURIComponent(returnPath)}` : "";
    window.history.replaceState(null, "", `/login${nextQuery}${nextIsLogin ? "" : "#register"}`);
  };

  useEffect(() => {
    const syncModeFromHash = () => {
      if (window.location.hash === "#register") setIsLogin(false);
    };
    syncModeFromHash();
    window.addEventListener("hashchange", syncModeFromHash);
    const params = new URLSearchParams(window.location.search);
    if (params.get("deleted") === "true") {
      window.setTimeout(() => setSuccess("تم حذف الحساب بنجاح. نتمنى رؤيتك مرة أخرى."), 0);
      window.history.replaceState(null, "", "/login");
    }
    return () => window.removeEventListener("hashchange", syncModeFromHash);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    void fetch("/api/health", { cache: "no-store", signal: controller.signal })
      .then((res) => setServiceStatus(res.ok ? "online" : "offline"))
      .catch(() => setServiceStatus("offline"))
      .finally(() => window.clearTimeout(timeout));
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  const validatePassword = (pass: string) => {
    if (pass.length < 8) return "كلمة المرور يجب أن تكون 8 أحرف على الأقل";
    if (!/[A-Za-z]/.test(pass)) return "كلمة المرور يجب أن تحتوي على حرف واحد على الأقل";
    if (!/[0-9]/.test(pass)) return "كلمة المرور يجب أن تحتوي على رقم واحد على الأقل";
    return "";
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (!isLogin) {
      if (!username.trim()) {
        setError("اسم المستخدم مطلوب");
        return;
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError("البريد الإلكتروني غير صالح");
        return;
      }
      const passError = validatePassword(password);
      if (passError) {
        setError(passError);
        return;
      }
      if (!termsAccepted) {
        setError("يجب الموافقة على شروط الاستخدام");
        return;
      }
    } else if (!username.trim() || !password) {
      setError("يرجى إدخال اسم المستخدم أو البريد الإلكتروني وكلمة المرور");
      return;
    }

    const turnstileRequired = process.env.NEXT_PUBLIC_TURNSTILE_MODE !== "testing" &&
      (process.env.NEXT_PUBLIC_TURNSTILE_REQUIRED === "1" || Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY));
    if (turnstileRequired && !turnstileToken) {
      setError(turnstileError || "يرجى إكمال التحقق الأمني أولًا");
      return;
    }

    setLoading(true);
    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const body = isLogin
        ? { username: username.trim(), password, cfTurnstileToken: turnstileToken }
        : { username: username.trim(), email: email.trim().toLowerCase(), password, termsAccepted, cfTurnstileToken: turnstileToken, website, formStartedAt };
      const controller = new AbortController();
      const requestTimeout = window.setTimeout(() => controller.abort(), 15000);
      let response: Response;
      try {
        response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } finally {
        window.clearTimeout(requestTimeout);
      }

      const data = await readAuthResponse(response);
      if (!response.ok) {
        setError(data.error || "حدث خطأ أثناء المصادقة");
        return;
      }

      if (data.user && typeof data.user.username === "string" && typeof data.user.role === "string") {
        announceAuthChange({
          username: data.user.username,
          role: data.user.role,
          balance: Number(data.user.balance || 0),
          is2faEnabled: Boolean(data.requires2fa),
          is2faVerified: !data.requires2fa,
          emailVerified: true,
        });
      }

      if (data.requires2fa) {
        router.push(`/verify-2fa?next=${encodeURIComponent(returnPath)}`);
      } else {
        router.push(returnPath);
      }
    } catch (err: unknown) {
      const isTimeout = err instanceof DOMException && err.name === "AbortError";
      setError(isTimeout ? "استغرق الاتصال وقتًا أطول من المتوقع. تحقق من الاتصال وحاول مرة أخرى." : err instanceof Error ? err.message : "حدث خطأ أثناء المصادقة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-gold-bg flex min-h-screen flex-col px-5 py-6">
      <div className="relative flex items-center justify-between gap-2">
        <Link href={`/login?next=${encodeURIComponent(returnPath)}#register`} onClick={(event) => { event.preventDefault(); setAuthMode(false); }} className="gradient-luxe rounded-xl px-5 py-2.5 text-sm font-black text-[#111] shadow-[0_4px_24px_-4px_rgba(212,175,55,0.5)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110 active:scale-95">{t("auth.createAccount")}</Link>
        <div className="relative"><BrandMark size="md" imageClassName="ring-1 ring-[var(--color-gold)]/50" nameClassName="text-2xl font-black tracking-wide text-white" /><Sparkles className="absolute -top-1 -left-1 text-[var(--color-gold)]" size={14} /></div>
      </div>
      <div className="mt-4 flex justify-center" aria-live="polite"><div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-gold)]/20 bg-[#1c1308] px-3 py-1.5 text-[11px] font-bold text-zinc-300"><span className={`h-2 w-2 rounded-full ${serviceStatus === "online" ? "bg-emerald-400" : serviceStatus === "offline" ? "bg-red-400" : "animate-pulse bg-[var(--color-gold)]"}`} />{serviceStatus === "online" ? t("status.platformOnline") : serviceStatus === "offline" ? t("status.offline") : t("status.checking")}</div></div>
      <div className="flex flex-1 flex-col justify-center">
        <div className="mb-6 flex flex-col items-center gap-3"><div className="relative"><BrandMark showName={false} size="lg" imageClassName="!h-20 !w-20 rounded-3xl shadow-[0_0_60px_-8px_rgba(212,175,55,0.8)] ring-2 ring-[var(--color-gold)]/70" /><Sparkles className="absolute -top-2 -left-2 animate-pulse text-[var(--color-gold)]" size={22} /></div><h1 className="text-center text-4xl font-black text-gradient-luxe">{isLogin ? t("auth.welcomeBack") : t("auth.createAccount")}</h1><p className="text-center text-sm text-[var(--color-text-muted)]">{isLogin ? t("auth.loginSubtitle") : t("auth.registerSubtitle")}</p></div>
        <div className="glass-card animate-slideUp mx-auto w-full max-w-sm p-6 shadow-[0_24px_80px_-20px_rgba(212,175,55,0.35)]">
          {error && <div role="alert" aria-live="assertive" className="animate-shake mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center text-sm font-bold text-red-400">{error}</div>}
          {success && <div className="animate-fadeIn mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center text-sm font-bold text-emerald-400">{success}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="mb-2 block text-sm font-black text-white">{isLogin ? "اسم المستخدم أو البريد الإلكتروني" : t("auth.username")}</label><div className="relative">{isLogin && username.includes("@") ? <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-gold)]/70" size={19} /> : <User className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-gold)]/70" size={19} />}<input type="text" value={username} onChange={(event) => setUsername(event.target.value)} className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 pr-11 text-white placeholder:text-zinc-500 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-gold)]/40" placeholder={isLogin ? "ادخل بيانات الدخول" : t("auth.usernamePlaceholder")} autoComplete="username" required /></div></div>
            {!isLogin && <div><label className="mb-2 block text-sm font-black text-white">{t("auth.email")}</label><div className="relative"><Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-gold)]/70" size={19} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 pr-11 text-white placeholder:text-zinc-500 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-gold)]/40" placeholder="example@email.com" autoComplete="email" required /></div></div>}
            <div><label className="mb-2 block text-sm font-black text-white">{t("auth.password")}</label><div className="relative"><Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-gold)]/70" size={19} /><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 pr-11 pl-11 text-white placeholder:text-zinc-500 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-gold)]/40" placeholder="********" autoComplete={isLogin ? "current-password" : "new-password"} required /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-gold)]/70">{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></div>{!isLogin && <p className="mt-1.5 text-xs text-zinc-500">{t("auth.passwordHint")}</p>}</div>
            {!isLogin && <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5"><input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} className="mt-1 h-4 w-4 accent-[var(--color-primary)]" /><div className="text-xs leading-relaxed text-zinc-400">{t("auth.acceptTerms")} <Link href="/terms" target="_blank" className="font-bold text-[var(--color-primary)] hover:underline">{t("auth.terms")}</Link> {t("auth.compensationPolicy")}</div></label>}
            <input type="text" name="website" value={website} onChange={(event) => setWebsite(event.target.value)} autoComplete="off" tabIndex={-1} aria-hidden="true" className="absolute -left-[9999px] h-px w-px opacity-0" />
            <TurnstileWidget onToken={(token) => { setTurnstileToken(token); if (token) setTurnstileError(""); }} onError={(code) => { setTurnstileError(code === "110200" ? "هذا النطاق غير مضاف إلى إعدادات Turnstile." : "تعذر إكمال التحقق الأمني. أعد تحميل الصفحة وحاول مرة أخرى."); }} />
            <button type="submit" disabled={loading} className="btn-glow-pulse flex w-full items-center justify-center gap-2.5 rounded-xl gradient-luxe py-4 text-base font-black text-[#111] shadow-[0_8px_32px_-8px_rgba(212,175,55,0.6)] transition hover:brightness-110 disabled:opacity-50">{loading ? <Loader2 className="animate-spin" size={20} /> : <Crown size={20} />}{loading ? (isLogin ? t("auth.loggingIn") : t("auth.creating")) : isLogin ? t("auth.login") : t("auth.createAccount")}</button>
          </form>
          <button type="button" onClick={() => setAuthMode(!isLogin)} className="mt-5 flex w-full items-center justify-center gap-2 text-center text-sm font-black text-[var(--color-primary)] transition hover:text-[var(--color-gold-bright)]"><ArrowLeft size={16} />{isLogin ? t("auth.noAccount") : t("auth.hasAccount")}</button>
        </div>
        <div className="mx-auto mt-6 grid w-full max-w-sm grid-cols-2 gap-3"><div className="glass-card rounded-2xl p-4 text-center"><div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-gold)]/10 ring-1 ring-[var(--color-gold)]/30"><Zap className="text-[var(--color-gold)]" size={22} /></div><h3 className="text-sm font-black text-white">{t("auth.autoCrypto")}</h3><p className="mt-1 text-[11px] leading-relaxed text-zinc-400">{t("auth.autoCryptoDesc")}</p></div><div className="glass-card rounded-2xl p-4 text-center"><div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-gold)]/10 ring-1 ring-[var(--color-gold)]/30"><Rocket className="text-[var(--color-gold)]" size={22} /></div><h3 className="text-sm font-black text-white">{t("auth.instantExecution")}</h3><p className="mt-1 text-[11px] leading-relaxed text-zinc-400">{t("auth.instantExecutionDesc")}</p></div></div>
      </div>
    </div>
  );
}
