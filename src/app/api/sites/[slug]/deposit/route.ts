import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { loadPublicSite, publicSiteData } from "@/lib/reseller-sites";
import { requireSiteAuth } from "@/lib/session";
import {
  customerLogin,
  customerVerify,
  topupCard,
  startTransfer,
  confirmTransfer,
  resendTransferOtp,
  getAdminRow,
} from "@/lib/asiacell-gateway";

type Params = { params: Promise<{ slug: string }> };

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}

type PaymentMethod = { name: string; instructions: string; enabled: boolean };
type CryptoWallet = { coin: string; network: string; address: string; enabled: boolean; visible?: boolean };

const origin = process.env.NEXT_PUBLIC_APP_URL || "";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    await initDb();
    const auth = await requireSiteAuth(slug);
    if (!auth.ok) return auth.response;

    const loaded = await loadPublicSite(slug);
    if (!loaded.site) return NextResponse.json({ error: "الموقع غير موجود" }, { status: 404 });
    const origin = process.env.NEXT_PUBLIC_APP_URL || "https://zero-lake.vercel.app";
    const site = publicSiteData(loaded.site, origin, loaded.expired);
    const siteId = Number(loaded.site.id);

    // الطرق اليدوية
    const methods = (site.paymentMethods as { name: string; instructions: string; enabled: boolean }[] | undefined) || [];
    const enabled = methods.filter((method) => method.enabled !== false);

    // بوابة آسياسيل
    const asiResult = await db.execute({
      sql: "SELECT store_phone, exchange_rate, authenticated FROM reseller_asiacell_admin WHERE site_id = ? LIMIT 1",
      args: [siteId],
    });
    const asiRow = asiResult.rows[0] as Record<string, unknown> | undefined;
    const asiacell = {
      connected: asiRow ? Boolean(Number(asiRow.authenticated)) : false,
      admin_connected: asiRow ? Boolean(Number(asiRow.authenticated)) : false,
      store_phone: asiRow?.store_phone ? String(asiRow.store_phone) : "",
      exchange_rate: asiRow?.exchange_rate ? Number(asiRow.exchange_rate) : 1666,
    };

    // بوابات العملات الرقمية
    let cryptoWallets: CryptoWallet[] = [];
    try {
      const themeData = JSON.parse(String(loaded.site.theme_json || "{}"));
      const gateways = JSON.parse(String(themeData.gateways || "{}"));
      cryptoWallets = Array.isArray(gateways.cryptoWallets) ? gateways.cryptoWallets.filter((w: CryptoWallet) => w.enabled && w.address && w.visible !== false) : [];
    } catch {
      cryptoWallets = [];
    }

    return NextResponse.json({ paymentMethods: enabled, asiacell, cryptoWallets });
  } catch (error) {
    console.error("[site-deposit]", error instanceof Error ? error.stack || error.message : error);
    return NextResponse.json({ error: "تعذر تحميل طرق الدفع", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    await initDb();
    const auth = await requireSiteAuth(slug);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const action = String(body.action || "");

    const admin = await getAdminRow();

    const loaded = await loadPublicSite(slug);
    const siteId = loaded.site ? Number(loaded.site.id) : 0;
    const ownerResult = siteId
      ? await db.execute({ sql: "SELECT owner_user_id FROM reseller_sites WHERE id = ? LIMIT 1", args: [siteId] })
      : null;
    const ownerUserId = ownerResult?.rows[0] ? Number((ownerResult.rows[0] as unknown as Record<string, unknown>).owner_user_id) : 0;

    const siteTarget = loaded.site
      ? { siteId: Number(loaded.site.id), accountId: auth.session.userId! }
      : null;

    // ── آسياسيل ──
    if (action === "asiacell-login") {
      const result = await customerLogin(auth.session.userId!, String(body.phone || ""));
      return NextResponse.json(result);
    }
    if (action === "asiacell-verify-otp") {
      const result = await customerVerify(String(body.sessionId || ""), String(body.otp || ""));
      return NextResponse.json(result);
    }
    if (action === "asiacell-topup") {
      const sessionId = String(body.sessionId || "").trim() || undefined;
      const result = await topupCard(auth.session.userId!, sessionId, String(body.voucher || ""), admin, siteTarget);
      if (ownerUserId > 0 && result.success && result.credited) {
        await db.execute({ sql: "UPDATE users SET balance = balance + ? WHERE id = ?", args: [result.credited, ownerUserId] });
        await db.execute({ sql: "INSERT INTO transactions (user_id, type, amount, status, description, method) VALUES (?, 'deposit', ?, 'completed', ?, 'asiacell')", args: [ownerUserId, result.credited, `شحن آسياسيل فرع ${slug}: ${result.message}`] });
      }
      return NextResponse.json(result);
    }
    if (action === "asiacell-transfer") {
      const result = await startTransfer(auth.session.userId!, String(body.sessionId || ""), Number(body.amount || 0), admin);
      return NextResponse.json(result);
    }
    if (action === "asiacell-confirm") {
      const result = await confirmTransfer(auth.session.userId!, String(body.sessionId || ""), String(body.otp || ""), admin, siteTarget);
      if (ownerUserId > 0 && result.success && result.credited) {
        await db.execute({ sql: "UPDATE users SET balance = balance + ? WHERE id = ?", args: [result.credited, ownerUserId] });
        await db.execute({ sql: "INSERT INTO transactions (user_id, type, amount, status, description, method) VALUES (?, 'deposit', ?, 'completed', ?, 'asiacell')", args: [ownerUserId, result.credited, `تحويل آسياسيل فرع ${slug}: ${result.message}`] });
      }
      return NextResponse.json(result);
    }
    if (action === "asiacell-resend") {
      const result = await resendTransferOtp(String(body.sessionId || ""));
      return NextResponse.json(result);
    }

    // ── كريبتو: طلب شحن جديد ──
    if (action === "crypto-deposit") {
      const coin = String(body.coin || "").trim().toLowerCase();
      const network = String(body.network || "").trim().toLowerCase();
      const amount = Number(body.amount || 0);
      const txId = String(body.txId || "").trim();
      if (!coin || !amount || amount <= 0) return NextResponse.json({ error: "بيانات غير مكتملة" }, { status: 400 });

      const loaded2 = await loadPublicSite(slug);
      const siteData = loaded2.site ? publicSiteData(loaded2.site, origin || "", loaded2.expired) : null;

      // جلب عنوان المحفظة من إعدادات الفرع
      const themeData = loaded2.site ? JSON.parse(String((loaded2.site as Record<string, unknown>).theme_json || "{}")) : {};
      const gateways = JSON.parse(String(themeData.gateways || "{}"));
      const wallets: CryptoWallet[] = Array.isArray(gateways.cryptoWallets) ? gateways.cryptoWallets : [];
      const wallet = wallets.find((w) => w.coin === coin && w.network === network && w.enabled && w.address);
      if (!wallet) return NextResponse.json({ error: "بوابة الكريبتو غير مفعلة لهذا الشبكة" }, { status: 400 });

      const depositId = `BR-${siteId}-${Date.now()}`;
      await db.execute({
        sql: `INSERT INTO crypto_deposits (user_id, coin, network, amount, address, status, note, payment_id, order_id)
              VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
        args: [auth.session.userId!, coin, network, amount, wallet.address, `شحن كريبتو فرع ${slug}`, depositId, depositId],
      });

      // إذا المستخدم أرسل TxID مباشرة، نتحقق من OKX
      if (txId) {
        const { getOkxDepositHistory } = await import("@/lib/okx");
        const records = await getOkxDepositHistory({ ccy: coin, txId, limit: 10 });
        const record = records.find((r: { txId?: unknown }) => String(r.txId || "").toLowerCase() === txId.toLowerCase());
        if (record && String(record.state || "").toLowerCase() === "complete") {
          await db.execute({ sql: "UPDATE crypto_deposits SET status = 'completed', verification_status = 'verified' WHERE payment_id = ? AND status = 'pending'", args: [depositId] });
          await db.execute({ sql: "UPDATE reseller_accounts SET balance = balance + ? WHERE id = ? AND site_id = ?", args: [amount, auth.session.userId!, siteId] });
          await db.execute({ sql: "INSERT INTO reseller_transactions (site_id, account_id, type, amount, status, description, method) VALUES (?, ?, 'deposit', ?, 'completed', ?, 'crypto')", args: [siteId, auth.session.userId!, amount, `شحن كريبتو ${coin.toUpperCase()} عبر ${network} — تم التحقق تلقائيًا`] });
          if (ownerUserId > 0) {
            await db.execute({ sql: "UPDATE users SET balance = balance + ? WHERE id = ?", args: [amount, ownerUserId] });
            await db.execute({ sql: "INSERT INTO transactions (user_id, type, amount, status, description, method) VALUES (?, 'deposit', ?, 'completed', ?, 'crypto')", args: [ownerUserId, amount, `شحن كريبتو فرع ${slug}: ${coin.toUpperCase()} ${amount}$`] });
          }
          return NextResponse.json({ success: true, message: `تم شحن ${amount}$ ${coin.toUpperCase()} بنجاح`, depositId, autoVerified: true });
        }
        return NextResponse.json({ success: true, message: "تم إنشاء طلب الشحن — في انتظار التحقق", depositId, needsVerification: true });
      }

      return NextResponse.json({ success: true, message: "تم إنشاء طلب الشحن — أرسل TxID للتحقق", depositId, walletAddress: wallet.address, coin, network, amount });
    }

    // ── كريبتو: تأكيد txId ──
    if (action === "crypto-verify") {
      const txId = String(body.txId || "").trim();
      const depositId = String(body.depositId || "").trim();
      if (!txId || !depositId) return NextResponse.json({ error: "يجب إدخال رقم المعاملة (TxID)" }, { status: 400 });

      const deposit = await db.execute({
        sql: "SELECT * FROM crypto_deposits WHERE payment_id = ? AND user_id = ? AND status = 'pending' LIMIT 1",
        args: [depositId, auth.session.userId!],
      });
      if (deposit.rows.length === 0) return NextResponse.json({ error: "طلب الشحن غير موجود أو تمت معالجته" }, { status: 404 });
      const dep = deposit.rows[0] as Record<string, unknown>;
      const coin = String(dep.coin || "").toUpperCase();

      const { getOkxDepositHistory } = await import("@/lib/okx");
      const records = await getOkxDepositHistory({ ccy: coin, txId, limit: 10 });
      const record = records.find((r: { txId?: unknown }) => String(r.txId || "").toLowerCase() === txId.toLowerCase());

      if (!record) return NextResponse.json({ error: "لم تظهر هذه المعاملة في سجل OKX بعد — حاول لاحقًا" }, { status: 404 });
      if (String(record.state || "").toLowerCase() !== "complete") return NextResponse.json({ error: "المعاملة لم تكتمل بعد — حالة: " + String(record.state || "غير معروفة") }, { status: 400 });

      await db.execute({ sql: "UPDATE crypto_deposits SET status = 'completed', verification_status = 'verified', verification_txid = ? WHERE payment_id = ? AND status = 'pending'", args: [txId, depositId] });
      const depAmount = Number(dep.amount || 0);
      await db.execute({ sql: "UPDATE reseller_accounts SET balance = balance + ? WHERE id = ? AND site_id = ?", args: [depAmount, auth.session.userId!, siteId] });
      await db.execute({ sql: "INSERT INTO reseller_transactions (site_id, account_id, type, amount, status, description, method) VALUES (?, ?, 'deposit', ?, 'completed', ?, 'crypto')", args: [siteId, auth.session.userId!, depAmount, `شحن كريبتو ${coin} — تم التحقق عبر OKX`] });

      return NextResponse.json({ success: true, message: `تم شحن ${depAmount}$ ${coin} بنجاح` });
    }

    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  } catch (error) {
    console.error("[site-deposit-post]", error);
    return NextResponse.json({ error: "تعذر معالجة طلب الشحن" }, { status: 500 });
  }
}
