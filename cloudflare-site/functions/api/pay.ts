// POST /api/pay — backend for the NMI Payment Component (@nmipayments/nmi-pay).
//
// Mirrors the source project's Controllers/PaymentController.cs (route api/pay):
// accepts a JSON body, forwards a form-urlencoded sale to NMI's transact.php,
// and returns { success, transactionId } or { success:false, error }.
//
// This is deliberately separate from /api/payment (which the classic Collect.js
// page uses with a form-encoded body and raw NMI text response). The Payment
// Component posts JSON and expects the shaped { success, ... } response, so it
// gets its own endpoint rather than overloading /api/payment.
//
// Security keys are read from Cloudflare secrets (same names as payment.ts) —
// never hardcoded. The key must belong to the same merchant account as the
// client-side tokenization key for the selected environment, or NMI rejects it.
interface Env {
  NMI_PRIVATE_KEY?: string;
  NMI_PRIVATE_KEY_SANDBOX?: string;
  NMI_PRIVATE_KEY_SECURE?: string;
}

const SANDBOX_URL = "https://sandbox.nmi.com/api/transact.php";
const SECURE_URL = "https://secure.nmi.com/api/transact.php";

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "Cache-Control": "no-store" },
  });
}

// String fields copied straight through to NMI when present and non-empty.
// (customer + billing use NMI's own field names, so they pass through 1:1.)
const PASSTHROUGH_FIELDS = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "company",
  "address1",
  "address2",
  "city",
  "state",
  "zip",
  "country",
  "currency",
];

// 3DS fields arrive camelCase from the widget and map to NMI's snake_case names.
const THREE_DS_FIELD_MAP: Record<string, string> = {
  cardHolderAuth: "cardholder_auth",
  cavv: "cavv",
  directoryServerId: "directory_server_id",
  eci: "eci",
  threeDsVersion: "three_ds_version",
  xid: "xid",
};

function asString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  return "";
}

function parseNmiResponse(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of text.split("&")) {
    const eq = pair.indexOf("=");
    if (eq < 0) continue;
    out[decodeURIComponent(pair.slice(0, eq))] = decodeURIComponent(pair.slice(eq + 1));
  }
  return out;
}

export const onRequestPost = async (
  ctx: { request: Request; env: Env }
): Promise<Response> => {
  const { request, env } = ctx;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch (_e) {
    return json({ success: false, error: "Expected a JSON request body." }, 400);
  }

  const paymentToken = asString(body.paymentToken);
  const amount = Number(body.amount);
  if (!paymentToken) {
    return json({ success: false, error: "Payment token is required" }, 400);
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return json({ success: false, error: "Amount must be greater than zero" }, 400);
  }

  const isSecure = asString(body.nmi_env).toLowerCase() === "secure";
  const transactUrl = isSecure ? SECURE_URL : SANDBOX_URL;

  const securityKey = isSecure
    ? env.NMI_PRIVATE_KEY_SECURE
    : env.NMI_PRIVATE_KEY_SANDBOX || env.NMI_PRIVATE_KEY;
  if (!securityKey || securityKey.trim().length === 0) {
    return json(
      {
        success: false,
        error: `Server misconfigured: ${
          isSecure ? "NMI_PRIVATE_KEY_SECURE" : "NMI_PRIVATE_KEY_SANDBOX"
        } not set on the Cloudflare project.`,
      },
      500
    );
  }

  const nmi = new URLSearchParams();
  nmi.set("payment_token", paymentToken);
  nmi.set("amount", amount.toFixed(2));
  nmi.set("type", asString(body.type) || "sale");
  nmi.set("security_key", securityKey);

  for (const field of PASSTHROUGH_FIELDS) {
    const v = asString(body[field]);
    if (v) nmi.set(field, v);
  }
  for (const [src, dest] of Object.entries(THREE_DS_FIELD_MAP)) {
    const v = asString(body[src]);
    if (v) nmi.set(dest, v);
  }

  try {
    const upstream = await fetch(transactUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: nmi.toString(),
    });
    const text = await upstream.text();
    const data = parseNmiResponse(text);

    if (data.response === "1") {
      return json({ success: true, transactionId: data.transactionid }, 200);
    }
    return json(
      { success: false, error: data.responsetext || "Unknown error" },
      200
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return json({ success: false, error: "Upstream NMI error: " + msg }, 502);
  }
};
