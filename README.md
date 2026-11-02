# smatid_kyc_web

The Smatid KYC website: a public landing page at `/`, and the admin console at `/admin` for managing
API clients and reviewing KYC usage. Vue 3 + Vue Router + Vite. It talks to the KYC API
(`smatpay_kyc`), which is a separate repo.

| Page | What it does |
| --- | --- |
| `/` | Landing page: the checks, how it works, the API in short |
| `/admin/login` | Admin sign-in (email and password) |
| `/admin` | Dashboard: requests, errors and clients over 7, 30 or 90 days, requests per day, top clients, latest requests |
| `/admin/clients` | All clients with request counts. **New client** creates one and emails them their token |
| `/admin/clients/:id` | One client: details, usage, every request they made, and **Revoke access** |
| `/admin/usage` | Every logged KYC request, filtered by search text, client, check, result and date. Click a row to see what was searched and the full response |

## Development

```bash
npm install
npm run dev        # http://localhost:5173
```

In development, `/api` is proxied to the KYC API on `localhost:8011` (see `vite.config.js`), so start
that first. No `.env` is needed.

### Admins

Admins are created on the API side, not here:

```bash
cd ../smatpay_kyc
npm run admin:create -- --email you@smatid.com --name "Your Name"   # asks for a password
```

Running it again for the same email sets a new password and signs that admin out everywhere.

## Build and deploy

```bash
cp .env.example .env    # set VITE_API_URL, and VITE_CONTACT_EMAIL if you want an email link
npm run build           # writes dist/
```

| Setting | What it is |
| --- | --- |
| `VITE_API_URL` | The KYC API's public address, e.g. `https://dev-api.smatid.com` |
| `VITE_CONTACT_EMAIL` | Where "Request access" on the landing page sends people. Empty shows a plain note instead |

These are built into the files, so rebuild after changing them.

`dist/` is plain static files. On the server they're served by Apache, from `deploy/apache.conf`.
Every unknown path falls back to `index.html` (`FallbackResource`), so `/admin/...` links work on reload.

First time, as root on the server, once `dev-kyc.smatid.com` points at it:

```bash
mkdir -p /var/www/smatid-kyc-web
cp deploy/apache.conf /etc/apache2/sites-available/dev-kyc.smatid.com.conf
a2enmod headers
a2ensite dev-kyc.smatid.com
apache2ctl configtest && systemctl reload apache2
certbot --apache -d dev-kyc.smatid.com     # HTTPS, and redirects HTTP to it
```

Each release: build, then replace `/var/www/smatid-kyc-web/dist` with the new `dist/`. No Apache reload needed.

The API must allow the site's address in `CORS_ORIGINS` (in the API's `.env`), e.g.
`CORS_ORIGINS=https://dev-kyc.smatid.com`, or the browser blocks every call.

## How sign-in works

`POST /api/admin/login` returns a session token. It's kept in `localStorage` and sent as
`Authorization: Bearer adm_...`. Sessions end after `ADMIN_SESSION_HOURS` (12 by default) or on
**Sign out**, and any `401` sends you back to the sign-in page. A client's access token is shown once,
in the dialog right after the client is created, and is never stored here.
