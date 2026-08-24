"use client";

import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import { Shield, MessageSquare, AlertCircle, Loader2, Send } from "lucide-react";

type TicketRow = {
  id: number;
  subject: string;
  username?: string | null;
  type: string;
  status: "open" | "resolved" | "closed" | string;
  description: string;
  orderId?: number | string | null;
  adminReply?: string | null;
};

async function readApiResponse(response: Response, fallback: string) {
  const data = await response.json().catch(() => ({} as { error?: string; message?: string }));
  if (!response.ok) throw new Error(data.error || data.message || fallback);
  return data as { error?: string; message?: string; tickets?: TicketRow[] };
}

const TYPE_LABELS: Record<string, string> = {
  speed_up: "تسريع طلب",
  refill: "تعويض طلب",
  recharge_issue: "مشكلة في الشحن",
  cancel_order: "إلغاء طلب",
  other: "مشكلة أخرى",
  inquiry: "استفسار عام",
};

export default function AdminTicketsPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [replying, setReplying] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/user", { cache: "no-store" })
      .then((res) => readApiResponse(res, "تعذر التحقق من صلاحيات الحساب"))
      .then((data) => { if (active) setAuthorized(Boolean((data as { user?: { role?: string } }).user?.role === "admin")); })
      .catch(() => { if (active) { setAuthorized(false); setMessage("تعذر التحقق من صلاحيات الحساب"); } });
    return () => { active = false; };
  }, []);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tickets?status=${filter}`, { cache: "no-store" });
      const data = await readApiResponse(res, "تعذر تحميل التذاكر");
      setTickets(Array.isArray(data.tickets) ? data.tickets : []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تحميل التذاكر");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (!authorized) return;
    const timer = window.setTimeout(() => { void fetchTickets(); }, 0);
    return () => window.clearTimeout(timer);
  }, [authorized, fetchTickets]);

  const sendReply = async (ticketId: number) => {
    const reply = replyText.trim();
    if (!reply) return;
    setReplying(ticketId);
    setMessage("");
    try {
      const res = await fetch("/api/admin/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reply", ticketId, reply }),
      });
      await readApiResponse(res, "تعذر إرسال الرد");
      setReplyText("");
      setMessage("تم الرد بنجاح");
      await fetchTickets();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر إرسال الرد");
    } finally {
      setReplying(null);
    }
  };

  const changeStatus = async (ticketId: number, status: string) => {
    setMessage("");
    try {
      const res = await fetch("/api/admin/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status", ticketId, status }),
      });
      await readApiResponse(res, "تعذر تحديث حالة التذكرة");
      await fetchTickets();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تحديث حالة التذكرة");
    }
  };

  if (authorized === null) {
    return (
      <DashboardLayout>
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" />
        </div>
      </DashboardLayout>
    );
  }

  if (authorized === false) {
    return (
      <DashboardLayout>
        <div className="flex h-60 flex-col items-center justify-center text-center text-red-400">
          <AlertCircle size={48} className="mb-3" />
          <h2 className="text-xl font-bold">غير مصرح</h2>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Shield className="text-[var(--color-primary)]" size={28} />
          <h1 className="text-2xl font-black text-white">تذاكر الدعم</h1>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: "all", label: "الكل" },
            { id: "open", label: "مفتوحة" },
            { id: "resolved", label: "تم الرد" },
            { id: "closed", label: "مغلقة" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition ${
                filter === f.id
                  ? "bg-[var(--color-primary)] text-white"
                  : "border border-[var(--color-border)] bg-[var(--color-card)] text-zinc-400"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {message && (
          <div className={`rounded-xl p-3 text-sm font-bold ${message.includes("خطأ") || message.includes("فشل") ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
            {message}
          </div>
        )}

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="animate-spin text-[var(--color-primary)]" size={32} />
          </div>
        ) : tickets.length === 0 ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-8 text-center text-zinc-500">
            <MessageSquare size={48} className="mx-auto mb-3 opacity-50" />
            <p>لا توجد تذاكر</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-white">{ticket.subject}</div>
                    <div className="mt-1 text-xs text-zinc-400">
                      {ticket.username} • {TYPE_LABELS[ticket.type] || ticket.type}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      ticket.status === "open"
                        ? "bg-yellow-400/10 text-yellow-400"
                        : ticket.status === "resolved"
                        ? "bg-green-400/10 text-green-400"
                        : "bg-zinc-400/10 text-zinc-400"
                    }`}
                  >
                    {ticket.status === "open" ? "مفتوحة" : ticket.status === "resolved" ? "تم الرد" : "مغلقة"}
                  </span>
                </div>

                <p className="text-sm text-zinc-300">{ticket.description}</p>

                {ticket.orderId && (
                  <div className="text-xs text-zinc-500">
                    رقم الطلب: <span className="text-zinc-300">{ticket.orderId}</span>
                  </div>
                )}

                {ticket.adminReply && (
                  <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-3">
                    <div className="mb-1 text-xs font-bold text-green-400">رد الإدارة</div>
                    <p className="text-sm text-white">{ticket.adminReply}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <textarea
                    value={replying === ticket.id ? replyText : ""}
                    onChange={(e) => {
                      setReplying(ticket.id);
                      setReplyText(e.target.value);
                    }}
                    placeholder="اكتب ردك هنا..."
                    rows={2}
                    className="w-full resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--color-primary)]"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => sendReply(ticket.id)}
                      disabled={replying === ticket.id && !replyText.trim()}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] py-2.5 text-sm font-bold text-white disabled:opacity-50"
                    >
                      {replying === ticket.id ? <Loader2 className="animate-spin" size={16} /> : <><Send size={16} /> رد</>}
                    </button>
                    <button
                      onClick={() => changeStatus(ticket.id, ticket.status === "closed" ? "open" : "closed")}
                      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-bold text-zinc-300"
                    >
                      {ticket.status === "closed" ? "إعادة فتح" : "إغلاق"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
