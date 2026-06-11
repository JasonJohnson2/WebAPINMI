export interface Env {
  NMI_PRIVATE_KEY?: string;
  NMI_PRIVATE_KEY_SANDBOX?: string;
  NMI_PRIVATE_KEY_SECURE?: string;
}

export type PagesContext<E = Env> = {
  request: Request;
  env: E;
  params: Record<string, string | string[]>;
  waitUntil: (promise: Promise<unknown>) => void;
  next: () => Promise<Response>;
  data: Record<string, unknown>;
};

export type V5Environment = "sandbox" | "secure";

export const MAX_REQUEST_BYTES = 1_048_576;

export function json(
  body: unknown,
  init: ResponseInit = {}
): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
}

export function normalizeAuthorizationKey(value: string | null): string | null {
  if (!value) return null;
  let v = value.trim();
  if (v.toLowerCase().startsWith("bearer ")) {
    v = v.substring("bearer ".length).trim();
  }
  return v.length === 0 ? null : v;
}

export function parseEnvironment(value: unknown): V5Environment | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (v === "sandbox") return "sandbox";
  if (v === "secure" || v === "production" || v === "prod") return "secure";
  return null;
}

export function getPrivateKeyForEnv(
  env: Env,
  which: V5Environment
): string | null {
  const candidate =
    which === "secure"
      ? env.NMI_PRIVATE_KEY_SECURE || env.NMI_PRIVATE_KEY
      : env.NMI_PRIVATE_KEY_SANDBOX;
  if (!candidate) return null;
  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function baseUrlForEnvironment(which: V5Environment): string {
  return which === "secure" ? "https://secure.nmi.com" : "https://sandbox.nmi.com";
}

export async function readRequestTextWithLimit(
  request: Request
): Promise<{ ok: true; text: string } | { ok: false; response: Response }> {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const n = Number(contentLength);
    if (Number.isFinite(n) && n > MAX_REQUEST_BYTES) {
      return {
        ok: false,
        response: json(
          { success: false, error: "Request body too large" },
          { status: 413 }
        ),
      };
    }
  }
  const text = await request.text();
  if (text.length > MAX_REQUEST_BYTES) {
    return {
      ok: false,
      response: json(
        { success: false, error: "Request body too large" },
        { status: 413 }
      ),
    };
  }
  return { ok: true, text };
}

export async function forwardNmiV5ApiAsync(args: {
  httpMethod: string;
  relativeUrl: string;
  apiKey: string;
  baseUrl?: string | null;
  body?: unknown;
  defaultHostWhenBaseUrlEmpty: string;
}): Promise<Response> {
  const method = args.httpMethod.toUpperCase();
  const host = (args.baseUrl && args.baseUrl.length > 0)
    ? args.baseUrl.replace(/\/+$/, "")
    : args.defaultHostWhenBaseUrlEmpty;
  const apiEndpoint = `${host}/api${args.relativeUrl}`;
  const timestamp = new Date().toISOString();

  const headers: Record<string, string> = {
    "Authorization": args.apiKey,
    "Accept": "application/json",
  };

  let bodyInit: BodyInit | undefined;
  const methodSendsBody = method === "POST" || method === "PUT" || method === "PATCH";
  if (methodSendsBody && args.body !== undefined && args.body !== null) {
    bodyInit = JSON.stringify(args.body);
    headers["Content-Type"] = "application/json";
  }

  try {
    const upstream = await fetch(apiEndpoint, { method, headers, body: bodyInit });
    const responseText = await upstream.text();

    if (upstream.ok) {
      let parsed: unknown = responseText;
      try {
        parsed = responseText.length > 0 ? JSON.parse(responseText) : "";
      } catch (_e) {
        parsed = responseText;
      }
      return json({
        success: true,
        statusCode: upstream.status,
        data: parsed,
        timestamp,
      });
    }

    return json({
      success: false,
      statusCode: upstream.status,
      error: "NMI V5 API request failed",
      message: responseText,
      timestamp,
    });
  } catch (err) {
    console.error("forwardNmiV5ApiAsync upstream error", err);
    return json(
      {
        success: false,
        error: "Gateway error",
        message: "Unable to connect to NMI V5 API",
      },
      { status: 502 }
    );
  }
}
