import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

type BalanceBody = {
  username?: string;
  amount?: string | number;
  type?: "subtract" | "add" | string;
};

type BalanceUserRow = {
  id: number | string;
  balance: number | string;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "";
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const { username, amount, type } = (await request.json()) as BalanceBody;
    const normalizedUsername = String(username || "").trim();
    const changeAmount = Number(amount);
    const balanceType = type === "add" || type === "subtract" ? type : null;

    if (!normalizedUsername || !Number.isFinite(changeAmount) || changeAmount <= 0 || changeAmount > 1_000_000 || !balanceType) {
      return NextResponse.json({ error: "اسم المستخدم والمبلغ والنوع مطلوبون، والمبلغ يجب أن يكون موجبًا ومحدودًا" }, { status: 400 });
    }

    const userResult = await db.execute({
      sql: "SELECT id, balance FROM users WHERE username = ? AND role != 'admin'",
      args: [normalizedUsername],
    });

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }

    const user = userResult.rows[0] as unknown as BalanceUserRow;
    const userId = Number(user.id);
    const currentBalance = Number(user.balance);
    if (!Number.isInteger(userId) || userId <= 0 || !Number.isFinite(currentBalance) || currentBalance < 0) {
      return NextResponse.json({ error: "بيانات رصيد المستخدم غير صالحة" }, { status: 409 });
    }
    if (balanceType === "subtract" && currentBalance < changeAmount) {
      return NextResponse.json({ error: "رصيد المستخدم غير كافٍ للخصم" }, { status: 400 });
    }

    const transaction = await db.transaction("write");
    try {
      const updated = await transaction.execute({
        sql: balanceType === "subtract"
          ? "UPDATE users SET balance = balance - ? WHERE id = ? AND role != 'admin' AND balance >= ?"
          : "UPDATE users SET balance = balance + ? WHERE id = ? AND role != 'admin'",
        args: balanceType === "subtract" ? [changeAmount, userId, changeAmount] : [changeAmount, userId],
      });
      if (Number(updated.rowsAffected || 0) !== 1) throw new Error("BALANCE_CONFLICT");
      await transaction.execute({
        sql: "INSERT INTO transactions (user_id, type, amount, status, description) VALUES (?, ?, ?, ?, ?)",
        args: [userId, "admin", balanceType === "subtract" ? -changeAmount : changeAmount, "completed", balanceType === "subtract" ? "خصم رصيد من الأدمن" : "إضافة رصيد من الأدمن"],
      });
      const updatedRow = await transaction.execute({ sql: "SELECT balance FROM users WHERE id = ?", args: [userId] });
      await transaction.commit();
      const newBalance = Number((updatedRow.rows[0] as unknown as Pick<BalanceUserRow, "balance"> | undefined)?.balance);
      if (!Number.isFinite(newBalance)) return NextResponse.json({ error: "تعذر قراءة الرصيد بعد التحديث" }, { status: 500 });
      return NextResponse.json({
        message: balanceType === "subtract" ? "تم خصم الرصيد" : "تم إضافة الرصيد",
        newBalance,
      });
    } catch (error) {
      await transaction.rollback().catch(() => undefined);
      if (error instanceof Error && error.message === "BALANCE_CONFLICT") return NextResponse.json({ error: "تغيّر الرصيد أو لم يعد كافيًا؛ أعد المحاولة" }, { status: 409 });
      throw error;
    }
  } catch (error: unknown) {
    const message = errorMessage(error);
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" || message === "Account banned" ? 403 : 500;
    if (status >= 500) console.error("Admin balance error:", error);
    return NextResponse.json({ error: status === 401 ? "يرجى تسجيل الدخول" : status === 403 ? "غير مصرح" : "تعذر تحديث الرصيد" }, { status });
  }
}
