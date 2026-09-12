import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="login-gold-bg flex min-h-screen flex-col items-center justify-center text-white">
      <Loader2 className="h-12 w-12 animate-spin text-[var(--color-gold)]" />
      <p className="mt-4 text-lg font-bold">جاري تحميل المنصة...</p>
    </div>
  );
}
