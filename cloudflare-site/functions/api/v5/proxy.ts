import { forwardNmiV5ApiAsync, json, type PagesContext } from "./_shared";

interface V5ProxyRequest {
  api_key?: string;
  method?: string;
  url?: string;
  body?: unknown;
  baseUrl?: string;
}

const ALLOWED_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

export const onRequestPost = async (
  ctx: PagesContext
): Promise<Response> => {
  let req: V5ProxyRequest;
  try {
    req = (await ctx.request.json()) as V5ProxyRequest;
  } catch (_e) {
    return json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const method = (req.method || "").toUpperCase();
  if (!ALLOWED_METHODS.has(method)) {
    return json(
      { success: false, error: `Unsupported HTTP method: ${req.method ?? ""}` },
      { status: 400 }
    );
  }

  if (!req.api_key || !req.url) {
    return json(
      { success: false, error: "api_key and url are required" },
      { status: 400 }
    );
  }

  return forwardNmiV5ApiAsync({
    httpMethod: method,
    relativeUrl: req.url,
    apiKey: req.api_key,
    baseUrl: req.baseUrl,
    body: req.body,
    defaultHostWhenBaseUrlEmpty: "https://sandbox.nmi.com",
  });
};
