import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOkxDepositHistory, OkxConfigurationError, OkxRequestError } from "@/lib/okx";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const OKX_SUCCESS_STATE = "2";
const DECIMAL_SCALE = 6;
const DECIMAL_FACTOR = 1_000_000;

type VerifyBody = { orderId?: unknown; txId?: unknown; amount?: unknown };
type CryptoDeposit = {
  id: number | string;
  user_id: number | string;
  coin: unknown;
  network: unknown;
  amount: unknown;
  address: unknown;
  status: unknown;
  payment_id?: unknown;
  order_id?: unknown;
  verification_txid?: unknown;
};
type OkxRecord = {
  txId?: unknown;
  ccy?: unknown;
  chain?: unknown;
  amt?: unknown;
  to?: unknown;
  state?: unknown;
  ts?: unknown;
  actualDepBlkConfirm?: unknown;
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function decimalUnits(value: unknown): number | null {
  const raw = typeof value === "number" ? (Number.isFinite(value) ? value.toFixed(DECIMAL_SCALE) : "") : text(value, 64);
  if (!raw || !/^\d+(?:\.\d{1,6})?$/.test(raw)) return null;
  const [integer, fraction = ""] = raw.split(".");
  const units = Number(`${integer}${fraction.padEnd(DECIMAL_SCALE, "0")}`);
  return Number.isSafeInteger(units) ? units : null;
}

function normalizedChain(value: unknown) {
  return text(value, 100).toUpperCase().replace(/[\s_]+/g, "-");
}

function chainMatches(expected: unknown, actual: unknown, coin: string) {
  const left = normalizedChain(expected);
  const right = normalizedChain(actual);
  if (!left || !right) return false;
  if (left === right) return true;
  const coinPrefix = `${coin.toUpperCase()}-`;
  const leftWithoutCoin = left.startsWith(coinPrefix) ? left.slice(coinPrefix.length) : left;
  const rightWithoutCoin = right.startsWith(coinPrefix) ? right.slice(coinPrefix.length) : right;
  return leftWithoutCoin === rightWithoutCoin;
}

function sameAddress(left: unknown, right: unknown) {
  const a = text(left, 300);
  const b = text(right, 300);
  return Boolean(a && b && a.toLowerCase() === b.toLowerCase());
}

function normalizeTxId(value: unknown) {
  return text(value, 256);
}

function isPendingStatus(value: unknown) {
  return text(value, 40).toLowerCase() === "pending";
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const userId = session.userId;
    if (typeof userId !== "number" || !Number.isSafeInteger(userId) || userId <= 0) return json({ error: "يرجى تسجيل الدخول" }, 401);

    const body = await request.json().catch(() => ({})) as VerifyBody;
    const orderId = text(body.orderId, 120);
    const txId = normalizeTxId(body.txId);
    const enteredAmount = decimalUnits(body.amount);

    if (!orderId || orderId.length < 8) return json({ error: "رقم طلب الشحن غير صالح" }, 400);
    if (txId.length < 20) return json({ error: "أدخل رقم المعاملة TxID/Hash كاملًا" }, 400);
    if (enteredAmount === null || enteredAmount <= 0) return json({ error: "أدخل مبلغ التحويل الصحيح" }, 400);

    const lookup = await db.execute({
      sql: "SELECT * FROM crypto_deposits WHERE order_id = ? AND user_id = ? LIMIT 1",
      args: [orderId, userId],
    });
    const deposit = lookup.rows[0] as unknown as CryptoDeposit | undefined;
    if (!deposit) return json({ error: "طلب الشحن غير موجود أو لا يخص هذا الحساب" }, 404);
    if (!isPendingStatus(deposit.status)) {
      if (text(deposit.status, 40).toLowerCase() === "completed") return json({ verified: true, alreadyVerified: true, message: "تم اعتماد هذا الطلب سابقًا" });
      return json({ error: "لا يمكن التحقق من طلب الشحن بهذه الحالة" }, 409);
    }
    if (text(deposit.payment_id, 200)) return json({ error: "هذا الطلب مرتبط ببوابة دفع أخرى، وليس تحقق OKX" }, 409);
    if (text(deposit.verification_txid, 256) && text(deposit.verification_txid, 256).toLowerCase() !== txId.toLowerCase()) {
      return json({ error: "تم إرسال معاملة تحقق مختلفة لهذا الطلب" }, 409);
    }

    const coin = text(deposit.coin, 20).toUpperCase();
    const expectedAmount = decimalUnits(deposit.amount);
    if (!coin || expectedAmount === null || expectedAmount <= 0) return json({ error: "إعداد مبلغ الإيداع غير صالح" }, 500);
    if (enteredAmount !== expectedAmount) return json({ error: "المبلغ المدخل لا يطابق مبلغ طلب الشحن" }, 400);

    let records: OkxRecord[];
    try {
      records = await getOkxDepositHistory({ ccy: coin, txId, limit: 100 }) as OkxRecord[];
    } catch (error) {
      if (error instanceof OkxConfigurationError) return json({ error: "تحقق OKX غير مهيأ حاليًا" }, 503);
      if (error instanceof OkxRequestError) return json({ error: "تعذر قراءة سجل OKX حاليًا، حاول لاحقًا" }, 502);
      return json({ error: "تعذر التحقق من التحويل حاليًا" }, 502);
    }

    const record = records.find((item) => normalizeTxId(item.txId).toLowerCase() === txId.toLowerCase());
    if (!record) {
      await db.execute({ sql: "UPDATE crypto_deposits SET verification_status = 'not_found', verification_note = ? WHERE id = ? AND status = 'pending'", args: ["لم يظهر TxID في سجل OKX", deposit.id] });
      return json({ error: "لم تظهر هذه المعاملة في سجل OKX بعد" }, 404);
    }

    const recordAmount = decimalUnits(record.amt);
    const recordState = text(record.state, 20);
    const matches = String(record.ccy || "").toUpperCase() === coin
      && chainMatches(deposit.network, record.chain, coin)
      && sameAddress(deposit.address, record.to)
      && recordAmount !== null
      && recordAmount === expectedAmount;

    if (!matches) {
      await db.execute({ sql: "UPDATE crypto_deposits SET verification_status = 'mismatch', verification_note = ? WHERE id = ? AND status = 'pending'", args: ["بيانات المعاملة لا تطابق العملة أو الشبكة أو العنوان أو المبلغ", deposit.id] });
      return json({ error: "بيانات التحويل لا تطابق طلب الشحن: تحقق من العملة والشبكة والعنوان والمبلغ" }, 400);
    }

    if (recordState !== OKX_SUCCESS_STATE) {
      await db.execute({
        sql: "UPDATE crypto_deposits SET verification_txid = ?, verification_status = 'pending', verification_note = ? WHERE id = ? AND status = 'pending'",
        args: [txId, `المعاملة موجودة لكن حالتها ${recordState || "غير معروفة"} ولم تصل لحالة النجاح`, deposit.id],
      });
      return json({ pending: true, error: "المعاملة موجودة، لكنها لم تصل إلى حالة النجاح النهائية في OKX بعد" }, 202);
    }

    const creditedAmount = expectedAmount / DECIMAL_FACTOR;
    const tx = await db.transaction("write");
    try {
      const claim = await tx.execute({
        sql: `UPDATE crypto_deposits
              SET status = 'completed', verification_txid = ?, verification_status = 'verified', verification_note = ?, actually_paid = ?, pay_currency = ?, verified_at = CURRENT_TIMESTAMP, confirmed_at = CURRENT_TIMESTAMP
              WHERE id = ? AND user_id = ? AND status = 'pending' AND (verification_txid IS NULL OR verification_txid = ?)`,
        args: [txId, "تمت مطابقة التحويل عبر OKX", creditedAmount, coin, deposit.id, userId, txId],
      });
      if (Number(claim.rowsAffected || 0) !== 1) {
        await tx.commit();
        return json({ verified: true, alreadyVerified: true, message: "تم اعتماد هذا الطلب سابقًا" });
      }

      await tx.execute({ sql: "UPDATE users SET balance = COALESCE(balance, 0) + ? WHERE id = ?", args: [creditedAmount, userId] });
      await tx.execute({
        sql: "UPDATE transactions SET status = 'completed' WHERE user_id = ? AND type = 'deposit' AND status = 'pending' AND description LIKE ?",
        args: [userId, `%${orderId}%`],
      });
      await tx.execute({
        sql: "INSERT INTO transactions (user_id, type, amount, status, description, method) VALUES (?, 'deposit', ?, 'completed', ?, 'OKX')",
        args: [userId, creditedAmount, `شحن كريبتو مؤكد عبر OKX — ${orderId} — TxID: ${txId}`],
      });
      await tx.execute({
        sql: "INSERT INTO notifications (user_id, title, body) VALUES (?, ?, ?)",
        args: [userId, "تم تأكيد الشحن", `تمت مطابقة تحويل USDT عبر OKX وإضافة $${creditedAmount.toFixed(6)} إلى محفظتك.`],
      });
      await tx.commit();
    } catch (error) {
      try { await tx.rollback(); } catch {}
      throw error;
    }

    const balanceResult = await db.execute({ sql: "SELECT balance FROM users WHERE id = ? LIMIT 1", args: [userId] });
    const balance = Number((balanceResult.rows[0] as { balance?: unknown } | undefined)?.balance || 0);
    return json({ verified: true, credited: creditedAmount, balance, confirmations: record.actualDepBlkConfirm || null, message: "تم التحقق من التحويل وإضافة الرصيد بنجاح" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Unauthorized") return json({ error: "يرجى تسجيل الدخول" }, 401);
    if (message === "Account banned") return json({ error: "الحساب محظور" }, 403);
    console.error("OKX deposit verification failed", error instanceof Error ? error.name : "UnknownError");
    return json({ error: "تعذر التحقق من التحويل حاليًا" }, 500);
  }
}
