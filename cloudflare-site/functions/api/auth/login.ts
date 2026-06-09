import {
  type AuthEnv,
  SESSION_SECONDS,
  buildSetCookie,
  passwordMatches,
  safeNextPath,
  signToken,
} from "../../_auth";

type Ctx = {
  request: Request;
  env: AuthEnv;
};

export const onRequestPost = async (ctx: Ctx): Promise<Response> => {
  const { request, env } = ctx;
  const secret = env.SITE_PASSWORD;
  if (typeof secret !== "string" || secret.length === 0) {
    return new Response(
      "Site misconfigured: SITE_PASSWORD secret is not set.",
      { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } }
    );
  }

  const form = await request.formData().catch(() => null);
  const password = form ? String(form.get("password") || "") : "";
  const rawNext = form ? String(form.get("next") || "") : "";
  const next = safeNextPath(rawNext);

  const ok = await passwordMatches(secret, password);
  if (!ok) {
    const loc = `/login?error=1&next=${encodeURIComponent(next)}`;
    return new Response(null, {
      status: 302,
      headers: { Location: loc, "Cache-Control": "no-store" },
    });
  }

  const expiry = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const token = await signToken(secret, expiry);

  return new Response(null, {
    status: 302,
    headers: {
      Location: next,
      "Set-Cookie": buildSetCookie(token, SESSION_SECONDS),
      "Cache-Control": "no-store",
    },
  });
};
