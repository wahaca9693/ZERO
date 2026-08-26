import crypto from "node:crypto";

const DEFAULT_OKX_BASE_URL = "https://www.okx.com";
const OKX_TIMEOUT_MS = 8_000;

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

function getConfig() {
  const apiKey = process.env.OKX_API_KEY?.trim();
  const secretKey = process.env.OKX_API_SECRET?.trim();
  const passphrase = process.env.OKX_API_PASSPHRASE?.trim();
  if (!apiKey || !secretKey || !passphrase) throw new OkxConfigurationError();
  const baseUrl = (process.env.OKX_API_BASE_URL?.trim() || DEFAULT_OKX_BASE_URL).replace(/\/$/, "");
  if (!/^https:\/\//i.test(baseUrl)) throw new OkxConfigurationError();
  return { apiKey, secretKey, passphrase, baseUrl };
}

export function isOkxConfigured() {
  try {
    getConfig();
    return true;
  } catch {
    return false;
  }
}

function signedHeaders(timestamp: string, requestPath: string, config: ReturnType<typeof getConfig>) {
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

export async function getOkxDepositHistory(input: {
  ccy: string;
  txId: string;
  limit?: number;
}): Promise<OkxDepositRecord[]> {
  const config = getConfig();
  const query = new URLSearchParams({
    ccy: input.ccy,
    txId: input.txId,
    limit: String(Math.min(Math.max(Math.trunc(input.limit || 100), 1), 100)),
  });
  const requestPath = `/api/v5/asset/deposit-history?${query.toString()}`;
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
