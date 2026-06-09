import { json, type PagesContext } from "../_shared";

interface CheckoutPaymentRequest {
  payment_token?: string;
  amount?: string;
}

export const onRequestPost = async (
  ctx: PagesContext
): Promise<Response> => {
  const { request, env } = ctx;

  let body: CheckoutPaymentRequest;
  try {
    body = (await request.json()) as CheckoutPaymentRequest;
  } catch (_e) {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const paymentToken = (body?.payment_token ?? "").trim();
  const amount = (body?.amount ?? "").trim();

  if (!paymentToken || !amount) {
    return json(
      { error: "Missing required fields: payment_token, amount" },
      { status: 400 }
    );
  }

  const privateKey = env.NMI_PRIVATE_KEY;
  if (!privateKey || privateKey.trim().length === 0) {
    return json(
      {
        error:
          "Server misconfigured: NMI_PRIVATE_KEY is not set. Run `wrangler secret put NMI_PRIVATE_KEY` or add it in the Cloudflare Pages dashboard.",
      },
      { status: 500 }
    );
  }

  const endpoint = "https://secure.nmi.com/api/v5/payments/sale";
  const upstreamBody = JSON.stringify({
    amount,
    payment_details: { payment_token: paymentToken },
  });

  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + privateKey,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: upstreamBody,
    });
    const text = await upstream.text();
    return new Response(text.length > 0 ? text : "{}", {
      status: upstream.status,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return json(
      { error: "Upstream V5 request failed", detail: msg },
      { status: 502 }
    );
  }
};
