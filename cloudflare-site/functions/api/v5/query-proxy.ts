import {
  baseUrlForEnvironment,
  getPrivateKeyForEnv,
  json,
  parseEnvironment,
  readRequestTextWithLimit,
  type PagesContext,
} from "./_shared";

interface QueryProxyRequest {
  environment?: string;
  parameters?: Record<string, string>;
}

// Allowed query.php parameter names. Any unknown key is rejected so the
// endpoint cannot be turned into a generic parameter-injection vector.
const ALLOWED_PARAMETERS: ReadonlySet<string> = new Set([
  "report_type",
  "condition",
  "transaction_type",
  "action_type",
  "source",
  "transaction_id",
  "subscription_id",
  "invoice_id",
  "customer_vault_id",
  "order_id",
  "result",
  "start_date",
  "end_date",
  "first_name",
  "last_name",
  "email",
  "company",
  "phone",
  "page_number",
  "result_limit",
  "result_order",
]);

export const onRequestPost = async (
  ctx: PagesContext
): Promise<Response> => {
  const sizeCheck = await readRequestTextWithLimit(ctx.request);
  if (!sizeCheck.ok) return sizeCheck.response;

  let req: QueryProxyRequest;
  try {
    req = sizeCheck.text.length > 0
      ? (JSON.parse(sizeCheck.text) as QueryProxyRequest)
      : ({} as QueryProxyRequest);
  } catch (_e) {
    return json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const environment = parseEnvironment(req.environment) ?? "sandbox";
  const securityKey = getPrivateKeyForEnv(ctx.env, environment);
  if (!securityKey) {
    console.error(
      `V5 query-proxy: missing NMI_PRIVATE_KEY_${environment.toUpperCase()} secret`
    );
    return json(
      { success: false, error: "Server misconfigured" },
      { status: 500 }
    );
  }

  const host = baseUrlForEnvironment(environment);
  const apiEndpoint = `${host}/api/query.php`;
  const timestamp = new Date().toISOString();

  const form = new URLSearchParams();
  form.set("security_key", securityKey);
  if (req.parameters && typeof req.parameters === "object") {
    for (const [k, v] of Object.entries(req.parameters)) {
      if (!ALLOWED_PARAMETERS.has(k)) {
        return json(
          { success: false, error: "Parameter not permitted" },
          { status: 400 }
        );
      }
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
    const contentType =
      upstream.headers.get("content-type")?.split(";")[0]?.trim() || "text/xml";

    return json({
      success: upstream.ok,
      statusCode: upstream.status,
      data: text,
      contentType,
      timestamp,
    });
  } catch (err) {
    console.error("V5 query-proxy upstream error", err);
    return json(
      {
        success: false,
        error: "Gateway error",
        message: "Unable to connect to NMI Query API",
      },
      { status: 502 }
    );
  }
};
