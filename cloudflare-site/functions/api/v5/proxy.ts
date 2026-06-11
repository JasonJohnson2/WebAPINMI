import {
  baseUrlForEnvironment,
  forwardNmiV5ApiAsync,
  getPrivateKeyForEnv,
  json,
  parseEnvironment,
  readRequestTextWithLimit,
  type PagesContext,
} from "./_shared";

interface V5ProxyRequest {
  environment?: string;
  method?: string;
  url?: string;
  body?: unknown;
}

const ALLOWED_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

const ID_SEGMENT = "[A-Za-z0-9_\\-]+";

const ALLOWED_PATHS: ReadonlyArray<RegExp> = [
  // Payments
  /^\/v5\/payments$/,
  new RegExp(`^/v5/payments/(sale|auth|credit|validate)$`),
  new RegExp(`^/v5/payments/${ID_SEGMENT}$`),
  new RegExp(`^/v5/payments/${ID_SEGMENT}/(capture|void|refund)$`),
  // Invoices
  /^\/v5\/invoices$/,
  new RegExp(`^/v5/invoices/${ID_SEGMENT}$`),
  new RegExp(`^/v5/invoices/${ID_SEGMENT}/(close|send)$`),
  // Subscriptions
  /^\/v5\/subscriptions$/,
  new RegExp(`^/v5/subscriptions/${ID_SEGMENT}$`),
  // Plans
  /^\/v5\/plans$/,
  new RegExp(`^/v5/plans/${ID_SEGMENT}$`),
  // Customers and child resources
  /^\/v5\/customers$/,
  new RegExp(`^/v5/customers/${ID_SEGMENT}$`),
  new RegExp(`^/v5/customers/${ID_SEGMENT}/billing$`),
  new RegExp(`^/v5/customers/${ID_SEGMENT}/billing/${ID_SEGMENT}$`),
  new RegExp(`^/v5/customers/${ID_SEGMENT}/shipping$`),
  new RegExp(`^/v5/customers/${ID_SEGMENT}/shipping/${ID_SEGMENT}$`),
  // Products
  /^\/v5\/products$/,
  new RegExp(`^/v5/products/${ID_SEGMENT}$`),
];

function isAllowedPath(relativeUrl: string): boolean {
  const pathOnly = relativeUrl.split("?")[0] ?? "";
  return ALLOWED_PATHS.some((re) => re.test(pathOnly));
}

export const onRequestPost = async (
  ctx: PagesContext
): Promise<Response> => {
  const sizeCheck = await readRequestTextWithLimit(ctx.request);
  if (!sizeCheck.ok) return sizeCheck.response;

  let req: V5ProxyRequest;
  try {
    req = sizeCheck.text.length > 0
      ? (JSON.parse(sizeCheck.text) as V5ProxyRequest)
      : ({} as V5ProxyRequest);
  } catch (_e) {
    return json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const method = (req.method || "").toUpperCase();
  if (!ALLOWED_METHODS.has(method)) {
    return json(
      { success: false, error: "Unsupported HTTP method" },
      { status: 400 }
    );
  }

  if (typeof req.url !== "string" || req.url.length === 0) {
    return json(
      { success: false, error: "url is required" },
      { status: 400 }
    );
  }

  if (!isAllowedPath(req.url)) {
    return json(
      { success: false, error: "Endpoint not permitted" },
      { status: 403 }
    );
  }

  const environment = parseEnvironment(req.environment) ?? "sandbox";
  const apiKey = getPrivateKeyForEnv(ctx.env, environment);
  if (!apiKey) {
    console.error(
      `V5 proxy: missing NMI_PRIVATE_KEY_${environment.toUpperCase()} secret`
    );
    return json(
      { success: false, error: "Server misconfigured" },
      { status: 500 }
    );
  }

  return forwardNmiV5ApiAsync({
    httpMethod: method,
    relativeUrl: req.url,
    apiKey,
    baseUrl: baseUrlForEnvironment(environment),
    body: req.body,
    defaultHostWhenBaseUrlEmpty: baseUrlForEnvironment(environment),
  });
};
