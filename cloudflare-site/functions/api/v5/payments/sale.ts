import {
  forwardNmiV5ApiAsync,
  json,
  normalizeAuthorizationKey,
  type PagesContext,
} from "../_shared";

export const onRequestPost = async (
  ctx: PagesContext
): Promise<Response> => {
  const { request } = ctx;
  const apiKey = normalizeAuthorizationKey(request.headers.get("Authorization"));
  if (!apiKey) {
    return json(
      {
        success: false,
        error: "Missing Authorization",
        message: "NMI API key is required in the Authorization header.",
      },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const baseUrl = url.searchParams.get("baseUrl");

  let body: unknown = undefined;
  const raw = await request.text();
  if (raw.length > 0) {
    try {
      body = JSON.parse(raw);
    } catch (_e) {
      return json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }
  }

  return forwardNmiV5ApiAsync({
    httpMethod: "POST",
    relativeUrl: "/v5/payments/sale",
    apiKey,
    baseUrl,
    body,
    defaultHostWhenBaseUrlEmpty: "https://secure.nmi.com",
  });
};
