# MyWebAPI V5 — Cloudflare Pages

This is a static slice of the MyWebAPI demo (`Main.html` + the V5 API pages)
rebuilt for Cloudflare Pages. The .NET backend is **not** deployed; the C#
endpoints under `V5ApiController` were re-implemented as TypeScript
[Pages Functions](https://developers.cloudflare.com/pages/functions/) so the
whole thing runs on the Cloudflare Pages free tier (no credit card required).

## Layout

```
cloudflare-site/
  public/                          ← static assets served as-is
    index.html                     (was wwwroot/Main.html)
    login.html                     ← branded login page
    main.js, main.css, utilities.js
    V5Api/
      checkout.html, v5Api.html, v5Api.js, v5Api.css,
      v5Collect3dsCheckout.html, v5Collect3dsCheckout.js
  functions/
    _middleware.ts                 ← password gate for the whole site
    _auth.ts                       ← HMAC sign/verify helper (not routed)
    api/
      payment.ts                   POST /api/payment (transact.php direct-post)
      auth/
        login.ts                   POST /api/auth/login
        logout.ts                  ANY  /api/auth/logout
      v5/
        _shared.ts                 ← shared NMI V5 forwarding helper
        health.ts                  GET  /api/v5/health
        payments/sale.ts           POST /api/v5/payments/sale
        checkout/process-payment.ts POST /api/v5/checkout/process-payment
        proxy.ts                   POST /api/v5/proxy
        query-proxy.ts             POST /api/v5/query-proxy
  wrangler.toml
```

## Endpoints

| Method | Path                                | Source                                 |
| ------ | ----------------------------------- | -------------------------------------- |
| GET    | `/api/v5/health`                    | `functions/api/v5/health.ts`           |
| POST   | `/api/v5/payments/sale`             | `functions/api/v5/payments/sale.ts`    |
| POST   | `/api/v5/checkout/process-payment`  | `functions/api/v5/checkout/process-payment.ts` |
| POST   | `/api/v5/proxy`                     | `functions/api/v5/proxy.ts`            |
| POST   | `/api/v5/query-proxy`               | `functions/api/v5/query-proxy.ts`      |
| POST   | `/api/payment`                      | `functions/api/payment.ts` — transact.php direct-post sale |
| POST   | `/api/auth/login`                   | `functions/api/auth/login.ts`          |
| ANY    | `/api/auth/logout`                  | `functions/api/auth/logout.ts`         |

All `/api/v5/*` functions return a `{ success, statusCode, data, timestamp }`
envelope. `process-payment.ts` streams the raw V5 response body back with the
upstream status code, matching the original behavior.

## Environment variables / secrets

| Name                       | Used by                                      | How to set in production |
| -------------------------- | -------------------------------------------- | ------------------------ |
| `SITE_PASSWORD`            | `functions/_middleware.ts`, `functions/api/auth/login.ts` | `wrangler pages secret put SITE_PASSWORD` *or* Cloudflare dashboard → Settings → Variables and Secrets → "Encrypt" |
| `NMI_PRIVATE_KEY`          | `functions/api/v5/checkout/process-payment.ts`, `functions/api/payment.ts`; also the production fallback for `proxy.ts` / `query-proxy.ts` | `wrangler pages secret put NMI_PRIVATE_KEY` |
| `NMI_PRIVATE_KEY_SANDBOX`  | `functions/api/v5/proxy.ts`, `functions/api/v5/query-proxy.ts` when `environment=sandbox` | `wrangler pages secret put NMI_PRIVATE_KEY_SANDBOX` |
| `NMI_PRIVATE_KEY_SECURE`   | `functions/api/v5/proxy.ts`, `functions/api/v5/query-proxy.ts` when `environment=secure` (production); falls back to `NMI_PRIVATE_KEY` if unset | `wrangler pages secret put NMI_PRIVATE_KEY_SECURE` |

`SITE_PASSWORD` and at least one of the NMI key secrets are **required**. The
middleware fails closed: if `SITE_PASSWORD` is unset, *every* request returns
HTTP 503 — so a misconfigured deploy can't accidentally leak the site.

The V5 proxy endpoints `/proxy` and `/query-proxy` **never** accept a
merchant API key from the browser. Clients send only an `environment`
selector (`"sandbox"` or `"secure"`) and the function looks up the matching
secret server-side, mirroring the pattern in `process-payment.ts`. `/proxy`
additionally enforces an allowlist of V5 endpoint paths and a 1 MB request
size limit.

**Never** put any `NMI_PRIVATE_KEY*` value or `SITE_PASSWORD` in client-side
code or commit either to git.

## Authentication

The entire site (every static page **and** every `/api/*` endpoint) sits
behind a shared-password gate enforced by `functions/_middleware.ts`. The flow:

1. Visiting any URL without a valid `auth` cookie redirects HTML requests to
   `/login?next=<original-path>` and returns `401 {"success":false,...}` JSON
   to non-HTML requests (so the `/api/v5/*` endpoints can't be hit from a
   third-party page without first logging in via the browser).
2. The login form (`public/login.html`) POSTs `password` + `next` to
   `/api/auth/login`. On success, the function issues an HMAC-signed cookie
   (`auth=<expiry>.<sig>`, `HttpOnly; Secure; SameSite=Lax; 24h`) and redirects
   to the validated `next` path.
3. Cookie verification uses `crypto.subtle.verify` (constant-time) and the
   HMAC key is `SITE_PASSWORD` itself — so changing the secret instantly
   invalidates every existing session.
4. To force logout, hit `GET /api/auth/logout`. It clears the cookie and
   redirects to `/login`.

The bypass list inside the middleware is exactly: `/login`, `/login.html`,
`/api/auth/login`, `/api/auth/logout`, `/favicon.ico`. Everything else
requires a valid cookie.

### Local development

Create `cloudflare-site/.dev.vars` (gitignored — do not commit):

```
SITE_PASSWORD=pick-a-test-password
NMI_PRIVATE_KEY=your-sandbox-private-key
```

Then `wrangler pages dev public` and open `http://localhost:8788/`.

## Deploy

You need a free Cloudflare account. No credit card required for the Pages free
tier.

### Option A — Wrangler CLI (recommended for first deploy)

```sh
# 1. Install wrangler (one time, globally)
npm install -g wrangler

# 2. Authenticate (opens browser)
wrangler login

# 3. From this directory:
cd cloudflare-site

# 4. Deploy. The first deploy will prompt you to create the project
#    "mywebapi-v5". Output dir is "public" (set in wrangler.toml).
wrangler pages deploy public

# 5. Set both encrypted secrets (paste each value when prompted):
wrangler pages secret put SITE_PASSWORD   --project-name mywebapi-v5
wrangler pages secret put NMI_PRIVATE_KEY --project-name mywebapi-v5
```

After the secrets are set, redeploy (`wrangler pages deploy`) so the new
function build picks them up. Until `SITE_PASSWORD` is set, every request
returns 503.

### Option B — Connect this GitHub repo in the Cloudflare dashboard

1. Push this repo to GitHub.
2. In the Cloudflare dashboard: **Workers & Pages → Create application → Pages
   → Connect to Git**, pick the repo.
3. Build settings:
   - **Framework preset**: None
   - **Build command**: *(leave empty)*
   - **Build output directory**: `cloudflare-site/public`
   - **Root directory (advanced)**: `cloudflare-site`
   - Functions are auto-discovered under `cloudflare-site/functions`.
4. After the first deploy, go to **Settings → Variables and Secrets → Add
   variable**. Add **both** `SITE_PASSWORD` and `NMI_PRIVATE_KEY` (type:
   **Secret / Encrypt**) for the production environment, then redeploy.
   Until `SITE_PASSWORD` is set, every request returns 503.

### Local dev

```sh
cd cloudflare-site
wrangler pages dev public
```

Then visit `http://localhost:8788/`. Set the local secrets with a `.dev.vars`
file (gitignored — do **not** commit it):

```
SITE_PASSWORD=pick-a-test-password
NMI_PRIVATE_KEY=your-key-here
```

## Pages NOT included from the original wwwroot

The navbar in `index.html` / `utilities.js` still links to pages we did not
extract (`paymentComponent.html`, `cloudPOS.html`, `transactionHistory.html`,
`queryApi.html`, `ayncStatus.html`, `3DSBrowser.html`, `eKashu.html`,
`partnerApi.html`, `usaepay.html`, `invoiceApi.html`). Those links 404 by
design — port the controllers and copy the static files into `public/` if you
need any of them.

## `/api/payment` (transact.php direct-post)

`public/main.js` POSTs the payment form (FormData) to `/api/payment`, which
forwards every field to NMI's classic `transact.php` API with
`security_key = env.NMI_PRIVATE_KEY` and returns NMI's raw query-string
response. The `nmi_env` field (added by the page's env toggle) selects
`sandbox.nmi.com` vs `secure.nmi.com`. ACH/eCheck and 3DS fields pass through
unchanged because the function forwards every form field.

For this endpoint to succeed, your `NMI_PRIVATE_KEY` value must be valid as
the merchant's `security_key` for the environment you target — same account
for both `sandbox` and `secure` works, otherwise you'll see
`Sandbox accounts must use sandbox.nmi.com` from NMI.
