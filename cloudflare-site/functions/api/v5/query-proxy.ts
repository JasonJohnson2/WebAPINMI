import { json, type PagesContext } from "./_shared";

interface QueryProxyRequest {
  security_key?: string;
  parameters?: Record<string, string>;
  baseUrl?: string;
}

export const onRequestPost = async (
  ctx: PagesContext
): Promise<Response> => {
  let req: QueryProxyRequest;
  try {
    req = (await ctx.request.json()) as QueryProxyRequest;
  } catch (_e) {
    return json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!req.security_key) {
    return json(
      { success: false, error: "security_key is required" },
      { status: 400 }
    );
  }

  const host = (req.baseUrl && req.baseUrl.length > 0)
    ? req.baseUrl.replace(/\/+$/, "")
    : "https://sandbox.nmi.com";
  const apiEndpoint = `${host}/api/query.php`;
  const timestamp = new Date().toISOString();

  const form = new URLSearchParams();
  form.set("security_key", req.security_key);
  if (req.parameters && typeof req.parameters === "object") {
    for (const [k, v] of Object.entries(req.parameters)) {
      if (v !== undefined && v !== null && String(v).length > 0) {
        form.set(k, String(v));
      }
    }
  }

  try {
    const upstream = await fetch(apiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const text = await upstream.text();
    const contentType = upstream.headers.get("content-type")?.split(";")[0]?.trim() || "text/xml";

    return json({
      success: upstream.ok,
      statusCode: upstream.status,
      data: text,
      contentType,
      timestamp,
      endpoint: apiEndpoint,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return json(
      {
        success: false,
        error: "Gateway error",
        message: "Unable to connect to NMI Query API",
        details: msg,
      },
      { status: 502 }
    );
  }
};
