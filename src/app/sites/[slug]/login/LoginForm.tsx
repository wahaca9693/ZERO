"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, User, Loader2, ArrowRight, Sparkles } from "lucide-react";

type Props = {
  slug: string;
  siteName: string;
  logoUrl?: string;
  primary: string;
  secondary: string;
};

export default function ResellerLoginForm({ slug, siteName, logoUrl, primary, secondary }: Props) {
  const router = useRouter();
  const search = useSearchParams();
  const [registerMode, setRegisterMode] = useState(search.get("mode") === "register");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const switchMode = (next: boolean) => {
    setRegisterMode(next); setError(""); setSuccess(""); setPassword("");
    router.replace(`/sites/${encodeURIComponent(slug)}/login${next ? "?mode=register" : ""}`);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setSuccess("");
    if (registerMode && (!email || !termsAccepted)) { setError("أدخل البريد الإلكتروني ووافق على شروط الموقع."); return; }
    setLoading(true);
    try {
      const response = await fetch(`/api/sites/${encodeURIComponent(slug)}/auth/${registerMode ? "register" : "login"}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), email: email.trim().toLowerCase(), password, termsAccepted }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر إتمام العملية");
      setSuccess(registerMode ? "تم إنشاء حسابك داخل هذا الموقع." : "تم تسجيل الدخول.");
      window.setTimeout(() => router.push(`/sites/${encodeURIComponent(slug)}`), 350);
    } catch (caught: unknown) { setError(caught instanceof Error ? caught.message : "تعذر إتمام العملية"); } finally { setLoading(false); }
  };

  return <main dir="rtl" className="flex min-h-screen flex-col bg-[#0b0b09] px-5 py-6 text-white" style={{ "--site-primary": primary, "--site-secondary": secondary } as React.CSSProperties}>
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
      <button type="button" onClick={() => router.push(`/sites/${encodeURIComponent(slug)}`)} className="mb-6 flex items-center gap-2 self-start text-sm font-black text-[var(--site-primary)]"><ArrowRight size={18} /> العودة إلى {siteName}</button>
      <div className="mb-6 text-center">
        <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center">
          {logoUrl ? (
             <img src={logoUrl} alt={siteName} className="h-full w-full rounded-3xl object-contain shadow-[0_0_55px_-12px_var(--site-primary)] ring-1 ring-[var(--site-primary)]" />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-3xl bg-gradient-to-br from-[var(--site-primary)] to-[var(--site-secondary)] text-[#111] shadow-[0_0_55px_-12px_var(--site-primary)]"><Sparkles size={34} /></div>
          )}
        </div>
        <h1 className="text-3xl font-black text-white">{registerMode ? "إنشاء حساب" : "مرحبًا بعودتك"}</h1>
        <p className="mt-2 text-sm text-zinc-400">حسابك داخل {siteName}</p>
      </div>
      <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-xl">
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-black text-white">اسم المستخدم</span>
            <div className="relative">
              <User className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input required value={username} onChange={(event) => setUsername(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#121212] px-4 py-3.5 pr-11 text-white outline-none focus:border-[var(--site-primary)]" />
            </div>
          </label>
          {registerMode && (
            <label className="block">
              <span className="mb-2 block text-sm font-black text-white">البريد الإلكتروني</span>
              <div className="relative">
                <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#121212] px-4 py-3.5 pr-11 text-white outline-none focus:border-[var(--site-primary)]" />
              </div>
            </label>
          )}
          <label className="block">
            <span className="mb-2 block text-sm font-black text-white">كلمة المرور</span>
            <div className="relative">
              <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input type={showPassword ? "text" : "password"} required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#121212] px-4 py-3.5 pr-11 pl-11 text-white outline-none focus:border-[var(--site-primary)]" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" aria-label="إظهار أو إخفاء كلمة المرور">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {registerMode && <span className="mt-1 block text-xs text-zinc-500">8 أحرف على الأقل وتحتوي على حروف وأرقام.</span>}
          </label>
          {registerMode && (
            <label className="flex items-start gap-2 rounded-xl border border-white/10 bg-[#121212] p-3 text-xs leading-6 text-zinc-400">
              <input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} className="mt-1 accent-[var(--site-primary)]" /> أوافق على شروط استخدام هذا الموقع الفرعي.
            </label>
          )}
          {error && <div role="alert" className="rounded-xl bg-red-500/10 p-3 text-center text-sm font-bold text-red-300">{error}</div>}
          {success && <div className="rounded-xl bg-emerald-500/10 p-3 text-center text-sm font-bold text-emerald-300">{success}</div>}
          <button disabled={loading} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--site-primary)] py-4 font-black text-black hover:brightness-110 disabled:opacity-50">
            {loading && <Loader2 className="animate-spin" size={18} />}
            {registerMode ? "إنشاء الحساب" : "تسجيل الدخول"}
          </button>
        </form>
        <button type="button" onClick={() => switchMode(!registerMode)} className="mt-5 w-full text-center text-sm font-black text-[var(--site-primary)]">
          {registerMode ? "لديك حساب؟ تسجيل الدخول" : "ليس لديك حساب؟ إنشاء حساب"}
        </button>
        {!registerMode && <p className="mt-4 text-center text-xs text-zinc-500">استعادة كلمة المرور تتم من إدارة الموقع بعد تفعيل نظام البريد الخاص بالفرع.</p>}
      </div>
    </div>
  </main>;
}
