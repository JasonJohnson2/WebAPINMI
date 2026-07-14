import {
  type AuthEnv,
  readAuthCookie,
  safeNextPath,
  verifyToken,
} from "./_auth";

type Env = AuthEnv & Record<string, unknown>;

type Ctx = {
  request: Request;
  env: Env;
  next: () => Promise<Response>;
};

const BYPASS_PATHS = new Set<string>([
  "/login",
  "/login.html",
  "/api/auth/login",
  "/api/auth/logout",
  "/favicon.ico",
]);

function wantsHtml(request: Request): boolean {
  const accept = request.headers.get("accept") || "";
  if (accept.includes("text/html")) return true;
  const dest = request.headers.get("sec-fetch-dest");
  if (dest === "document" || dest === "iframe") return true;
  return false;
}

export const onRequest = async (ctx: Ctx): Promise<Response> => {
  const { request, env } = ctx;
  const url = new URL(request.url);

  const secret = env.SITE_PASSWORD;
  if (typeof secret !== "string" || secret.length === 0) {
    return new Response(
      "Site misconfigured: SITE_PASSWORD secret is not set. " +
        "Run `wrangler pages secret put SITE_PASSWORD` or add it in the " +
        "Cloudflare dashboard, then redeploy.",
      { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } }
    );
  }

  // The /.well-known/ directory holds public metadata (RFC 8615) — e.g. the
  // Apple Pay domain-association file NMI/Apple fetch server-to-server with no
  // auth cookie. It must stay reachable without a login or domain verification
  // fails.
  if (BYPASS_PATHS.has(url.pathname) || url.pathname.startsWith("/.well-known/")) {
    return ctx.next();
  }

  const token = readAuthCookie(request.headers.get("cookie"));
  const ok = await verifyToken(secret, token);
  if (ok) {
    return ctx.next();
  }

  if (wantsHtml(request)) {
    const next = safeNextPath(url.pathname + url.search);
    const loc = `/login?next=${encodeURIComponent(next)}`;
    return new Response(null, {
      status: 302,
      headers: { Location: loc, "Cache-Control": "no-store" },
    });
  }

  return new Response(
    JSON.stringify({ success: false, error: "Unauthorized", message: "Authentication required." }),
    {
      status: 401,
      headers: {
        "content-type": "application/json",
        "Cache-Control": "no-store",
      },
    }
  );
};
