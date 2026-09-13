"use client";

export default function SettingsContent({ slug, siteName, primary, secondary, expired }: { slug: string; siteName: string; primary: string; secondary: string; expired: boolean }) {
  return (
    <div className="space-y-6" style={{ "--site-primary": primary, "--site-secondary": secondary } as React.CSSProperties}>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="mb-6 text-2xl font-black text-white">الإعدادات</h1>
        
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-black text-white">إعدادات الحساب</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/5 p-5">
              <h3 className="mb-3 font-bold text-white">معلومات الملف الشخصي</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-bold text-zinc-400">اسم المستخدم</label>
                  <input type="text" defaultValue="مستخدم" className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none focus:border-[var(--site-primary)]" readOnly />
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-400">البريد الإلكتروني</label>
                  <input type="email" defaultValue="user@example.com" className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none focus:border-[var(--site-primary)]" readOnly />
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-400">الموقع الفرعي</label>
                  <input type="text" defaultValue={slug} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none focus:border-[var(--site-primary)]" readOnly />
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-5">
              <h3 className="mb-3 font-bold text-white">الأمان</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
                  <div>
                    <p className="font-bold text-white">التحقق بخطوتين (2FA)</p>
                    <p className="text-sm text-zinc-400">أضف طبقة أمان إضافية لحسابك</p>
                  </div>
                  <button className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-zinc-400 hover:border-[var(--site-primary)] hover:bg-white/10 hover:text-white">
                    تفعيل
                  </button>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
                  <div>
                    <p className="font-bold text-white">تغيير كلمة المرور</p>
                    <p className="text-sm text-zinc-400">تحديث كلمة المرور بانتظام للأمان</p>
                  </div>
                  <button className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-zinc-400 hover:border-[var(--site-primary)] hover:bg-white/10 hover:text-white">
                    تغيير
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-xl font-black text-white">الإشعارات</h2>
          <div className="space-y-3">
            {[
              { title: "إشعارات الطلبات", desc: "تحديثات حالة طلباتك" },
              { title: "إشعارات المحفظة", desc: "الإيداعات، السحوبات، والخصومات" },
              { title: "التذاكر والردود", desc: "الردود على تذاكرك" },
              { title: "العروض والترقيات", desc: "العروض الخاصة والخصومات" },
            ].map((notif) => (
              <div key={notif.title} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
                <div>
                  <p className="font-bold text-white">{notif.title}</p>
                  <p className="text-sm text-zinc-400">{notif.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--site-primary)]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-color-after-[var(--site-primary)] peer-checked:bg-[var(--site-primary)] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white/30 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-black text-white">منطقة الخطر</h2>
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-red-400">حذف الحساب</p>
                <p className="text-sm text-red-200/70">سيؤدي هذا إلى حذف حسابك وجميع بياناتك نهائياً. لا يمكن التراجع عن هذا الإجراء.</p>
              </div>
              <button className="rounded-xl bg-red-500/20 px-5 py-2.5 font-black text-red-400 hover:bg-red-500/30">
                حذف حسابي
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}