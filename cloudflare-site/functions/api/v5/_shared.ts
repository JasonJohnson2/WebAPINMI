export interface Env {
  NMI_PRIVATE_KEY?: string;
}

export type PagesContext<E = Env> = {
  request: Request;
  env: E;
  params: Record<string, string | string[]>;
  waitUntil: (promise: Promise<unknown>) => void;
  next: () => Promise<Response>;
  data: Record<string, unknown>;
};

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
        endpoint: apiEndpoint,
      });
    }

    return json({
      success: false,
      statusCode: upstream.status,
      error: "NMI V5 API request failed",
      message: responseText,
      timestamp,
      endpoint: apiEndpoint,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return json(
      {
        success: false,
        error: "Gateway error",
        message: "Unable to connect to NMI V5 API",
        details: msg,
      },
      { status: 502 }
    );
  }
}
