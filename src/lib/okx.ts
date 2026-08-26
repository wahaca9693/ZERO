import crypto from "node:crypto";
import { db } from "@/lib/db";

const DEFAULT_OKX_BASE_URL = "https://www.okx.com";
const OKX_TIMEOUT_MS = 8_000;
const SECRET_PROVIDER = "okx";

type OkxConfig = {
  apiKey: string;
  secretKey: string;
  passphrase: string;
  baseUrl: string;
};

export type OkxDepositRecord = {
  ccy?: unknown;
  chain?: unknown;
  amt?: unknown;
  to?: unknown;
  txId?: unknown;
  ts?: unknown;
  state?: unknown;
  actualDepBlkConfirm?: unknown;
  depId?: unknown;
};

type OkxResponse = {
  code?: unknown;
  msg?: unknown;
  data?: unknown;
};

export class OkxConfigurationError extends Error {
  constructor() {
    super("OKX_NOT_CONFIGURED");
    this.name = "OkxConfigurationError";
  }
}

export class OkxRequestError extends Error {
  constructor() {
    super("OKX_REQUEST_FAILED");
    this.name = "OkxRequestError";
  }
}

function normalizeConfig(input: Partial<OkxConfig>): OkxConfig | null {
  const apiKey = input.apiKey?.trim();
  const secretKey = input.secretKey?.trim();
  const passphrase = input.passphrase?.trim();
  const baseUrl = (input.baseUrl?.trim() || DEFAULT_OKX_BASE_URL).replace(/\/$/, "");
  if (!apiKey || apiKey.length > 200 || !secretKey || secretKey.length > 512 || !passphrase || passphrase.length > 512) return null;
  if (baseUrl.length > 200 || !/^https:\/\//i.test(baseUrl)) return null;
  return { apiKey, secretKey, passphrase, baseUrl };
}

function environmentConfig(): OkxConfig | null {
  return normalizeConfig({
    apiKey: process.env.OKX_API_KEY,
    secretKey: process.env.OKX_API_SECRET,
    passphrase: process.env.OKX_API_PASSPHRASE,
    baseUrl: process.env.OKX_API_BASE_URL,
  });
}

function encryptionKey() {
  const encoded = process.env.INTEGRATION_SECRETS_KEY?.trim();
  if (!encoded) throw new OkxConfigurationError();
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new OkxConfigurationError();
  return key;
}

function encryptConfig(config: OkxConfig) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(config), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

function decryptConfig(ciphertext: unknown): OkxConfig | null {
  if (typeof ciphertext !== "string") return null;
  const [version, ivEncoded, tagEncoded, encryptedEncoded] = ciphertext.split(".");
  if (version !== "v1" || !ivEncoded || !tagEncoded || !encryptedEncoded) return null;
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivEncoded, "base64url"));
    decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedEncoded, "base64url")), decipher.final()]).toString("utf8");
    const parsed = JSON.parse(decrypted) as Partial<OkxConfig>;
    return normalizeConfig(parsed);
  } catch {
    return null;
  }
}

export async function getOkxConfig(): Promise<OkxConfig> {
  try {
    const stored = await db.execute({ sql: "SELECT ciphertext FROM integration_secrets WHERE provider = ? LIMIT 1", args: [SECRET_PROVIDER] });
    const databaseConfig = decryptConfig((stored.rows[0] as { ciphertext?: unknown } | undefined)?.ciphertext);
    if (databaseConfig) return databaseConfig;
  } catch {
    // Environment variables remain a safe fallback if the optional Admin storage is unavailable.
  }
  const envConfig = environmentConfig();
  if (!envConfig) throw new OkxConfigurationError();
  return envConfig;
}

export async function getOkxConfigStatus() {
  let databaseConfigured = false;
  let updatedAt: string | null = null;
  try {
    const stored = await db.execute({ sql: "SELECT ciphertext, updated_at FROM integration_secrets WHERE provider = ? LIMIT 1", args: [SECRET_PROVIDER] });
    const row = stored.rows[0] as { ciphertext?: unknown; updated_at?: unknown } | undefined;
    databaseConfigured = Boolean(decryptConfig(row?.ciphertext));
    updatedAt = typeof row?.updated_at === "string" ? row.updated_at : null;
  } catch {}
  const envConfigured = Boolean(environmentConfig());
  return { configured: databaseConfigured || envConfigured, source: databaseConfigured ? "admin" : envConfigured ? "environment" : "none", updatedAt } as const;
}

async function mergedConfig(input?: Partial<OkxConfig>) {
  const current = await getOkxConfig().catch(() => null);
  const config = normalizeConfig({
    apiKey: input?.apiKey?.trim() || current?.apiKey,
    secretKey: input?.secretKey?.trim() || current?.secretKey,
    passphrase: input?.passphrase?.trim() || current?.passphrase,
    baseUrl: input?.baseUrl?.trim() || current?.baseUrl || DEFAULT_OKX_BASE_URL,
  });
  if (!config) throw new OkxConfigurationError();
  return config;
}

export async function saveOkxConfig(input: Partial<OkxConfig>) {
  const config = await mergedConfig(input);
  const ciphertext = encryptConfig(config);
  await db.execute({
    sql: `INSERT INTO integration_secrets (provider, ciphertext, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(provider) DO UPDATE SET ciphertext = excluded.ciphertext, updated_at = CURRENT_TIMESTAMP`,
    args: [SECRET_PROVIDER, ciphertext],
  });
  return getOkxConfigStatus();
}

export async function clearOkxConfig() {
  await db.execute({ sql: "DELETE FROM integration_secrets WHERE provider = ?", args: [SECRET_PROVIDER] });
  return getOkxConfigStatus();
}

export async function isOkxConfigured() {
  return (await getOkxConfigStatus()).configured;
}

function signedHeaders(timestamp: string, requestPath: string, config: OkxConfig) {
  const prehash = `${timestamp}GET${requestPath}`;
  const signature = crypto.createHmac("sha256", config.secretKey).update(prehash).digest("base64");
  return {
    "OK-ACCESS-KEY": config.apiKey,
    "OK-ACCESS-SIGN": signature,
    "OK-ACCESS-TIMESTAMP": timestamp,
    "OK-ACCESS-PASSPHRASE": config.passphrase,
    "Content-Type": "application/json",
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

async function requestOkx(query: Record<string, string>, configOverride?: OkxConfig) {
  const config = configOverride || await getOkxConfig();
  const search = new URLSearchParams(query);
  const requestPath = `/api/v5/asset/deposit-history${search.toString() ? `?${search.toString()}` : ""}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OKX_TIMEOUT_MS);
  try {
    const response = await fetch(`${config.baseUrl}${requestPath}`, {
      method: "GET",
      headers: signedHeaders(new Date().toISOString(), requestPath, config),
      cache: "no-store",
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({})) as OkxResponse;
    if (!response.ok || String(payload.code || "") !== "0") throw new OkxRequestError();
    return Array.isArray(payload.data) ? payload.data.map((item) => asRecord(item) as OkxDepositRecord) : [];
  } catch (error) {
    if (error instanceof OkxConfigurationError || error instanceof OkxRequestError) throw error;
    throw new OkxRequestError();
  } finally {
    clearTimeout(timer);
  }
}

export async function getOkxDepositHistory(input: { ccy?: string; txId?: string; limit?: number }): Promise<OkxDepositRecord[]> {
  const query: Record<string, string> = { limit: String(Math.min(Math.max(Math.trunc(input.limit || 100), 1), 100)) };
  if (input.ccy?.trim()) query.ccy = input.ccy.trim();
  if (input.txId?.trim()) query.txId = input.txId.trim();
  return requestOkx(query);
}

export async function testOkxConnection(input?: Partial<OkxConfig>) {
  const config = input ? await mergedConfig(input) : undefined;
  await requestOkx({ limit: "1" }, config);
  return { ok: true } as const;
}
