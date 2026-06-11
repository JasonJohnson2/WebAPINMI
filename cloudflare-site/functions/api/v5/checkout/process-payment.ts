import {
  json,
  readRequestTextWithLimit,
  type PagesContext,
} from "../_shared";

interface CheckoutPaymentRequest {
  payment_token?: string;
  amount?: string;
}

export const onRequestPost = async (
  ctx: PagesContext
): Promise<Response> => {
  const { request, env } = ctx;

  const sizeCheck = await readRequestTextWithLimit(request);
  if (!sizeCheck.ok) return sizeCheck.response;

  let body: CheckoutPaymentRequest;
  try {
    body = sizeCheck.text.length > 0
      ? (JSON.parse(sizeCheck.text) as CheckoutPaymentRequest)
      : ({} as CheckoutPaymentRequest);
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
    console.error("checkout/process-payment: NMI_PRIVATE_KEY secret not set");
    return json({ error: "Server misconfigured" }, { status: 500 });
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
    console.error("checkout/process-payment upstream error", err);
    return json(
      { error: "Upstream V5 request failed" },
      { status: 502 }
    );
  }
};
