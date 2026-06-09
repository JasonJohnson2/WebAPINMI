interface Env {
  NMI_PRIVATE_KEY?: string;
}

const SANDBOX_URL = "https://sandbox.nmi.com/api/transact.php";
const SECURE_URL = "https://secure.nmi.com/api/transact.php";

function nmiTextResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { "content-type": "application/x-www-form-urlencoded" },
  });
}

function nmiError(text: string, status: number): Response {
  const body = `response=3&responsetext=${encodeURIComponent(text)}&response_code=300`;
  return nmiTextResponse(body, status);
}

export const onRequestPost = async (
  ctx: { request: Request; env: Env }
): Promise<Response> => {
  const { request, env } = ctx;

  const securityKey = env.NMI_PRIVATE_KEY;
  if (!securityKey || securityKey.trim().length === 0) {
    return nmiError(
      "Server misconfigured: NMI_PRIVATE_KEY not set on the Cloudflare project.",
      500
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch (_e) {
    return nmiError("Expected multipart/form-data or url-encoded body.", 400);
  }

  const paymentToken = String(form.get("payment_token") || "").trim();
  const amountRaw = String(form.get("amount") || "").trim();
  const amount = Number(amountRaw);

  if (!paymentToken) {
    return nmiError("Payment token is required.", 400);
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return nmiError("Amount must be greater than zero.", 400);
  }

  const nmiEnv = String(form.get("nmi_env") || "").toLowerCase();
  const transactUrl = nmiEnv === "secure" ? SECURE_URL : SANDBOX_URL;

  const upstreamBody = new URLSearchParams();
  for (const [k, v] of form.entries()) {
    if (k === "nmi_env" || k === "payment_token" || k === "amount" || k === "type") continue;
    if (typeof v !== "string") continue;
    if (v.length === 0) continue;
    upstreamBody.set(k, v);
  }
  upstreamBody.set("security_key", securityKey);
  upstreamBody.set("payment_token", paymentToken);
  upstreamBody.set("amount", amount.toFixed(2));

  const txnType = String(form.get("type") || "").trim();
  if (txnType.length > 0) {
    upstreamBody.set("type", txnType);
  }

  try {
    const upstream = await fetch(transactUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: upstreamBody.toString(),
    });
    const text = await upstream.text();
    return nmiTextResponse(text || "response=3&responsetext=Empty+response&response_code=300", 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return nmiError("Upstream NMI error: " + msg, 502);
  }
};
