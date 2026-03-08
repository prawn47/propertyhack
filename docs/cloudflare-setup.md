# Cloudflare CDN Setup — PropertyHack

This guide covers the full Cloudflare configuration for propertyhack.com. Complete these steps in order after your domain is registered and your Sydney VPS is running.

---

## 1. DNS Migration

Move propertyhack.com DNS to Cloudflare so all traffic is proxied through Cloudflare's edge network.

### Steps

1. Log in to [dash.cloudflare.com](https://dash.cloudflare.com) and click **Add a Site**.
2. Enter `propertyhack.com` and click **Continue**.
3. Select the **Free** plan (or higher) and click **Continue**.
4. Cloudflare will scan your existing DNS records. Review them, then click **Continue**.
5. Add the following A record if not already present:

   | Type | Name | IPv4 Address | Proxy status |
   |------|------|-------------|--------------|
   | A | @ | `<your-sydney-vps-ip>` | Proxied (orange cloud) |
   | A | www | `<your-sydney-vps-ip>` | Proxied (orange cloud) |

   Replace `<your-sydney-vps-ip>` with the actual IP address of your Vultr Sydney VPS.

6. If you have an IPv6 address, add an AAAA record as well:

   | Type | Name | IPv6 Address | Proxy status |
   |------|------|-------------|--------------|
   | AAAA | @ | `<your-sydney-vps-ipv6>` | Proxied (orange cloud) |

7. Click **Continue** to proceed to the nameserver step.
8. Cloudflare will give you two nameserver addresses (e.g. `ada.ns.cloudflare.com`, `bob.ns.cloudflare.com`).
9. Log in to your domain registrar (wherever you bought propertyhack.com) and replace the existing nameservers with the two Cloudflare nameservers.
10. Click **Done, check nameservers** in Cloudflare. DNS propagation can take up to 24 hours, but usually completes in under an hour.

### Repeat for ccTLD domains

Add each ccTLD domain (propertyhack.com.au, propertyhack.au, propertyhack.co.uk, propertyhack.co, propertyhack.app) to Cloudflare the same way. Each gets its own site in the Cloudflare dashboard. You only need a single A record pointing to the same Sydney VPS IP for each.

---

## 2. SSL Configuration

Cloudflare sits in front of your origin server (Caddy). Both the Cloudflare-to-visitor connection and the Cloudflare-to-origin connection must be encrypted.

### Steps

1. In the Cloudflare dashboard, go to **SSL/TLS** in the left sidebar.
2. Under **Overview**, set the SSL/TLS encryption mode to **Full (Strict)**.

   > **Why Full (Strict)?** "Full" alone accepts any certificate at the origin, including self-signed. "Full (Strict)" requires a valid certificate — Caddy handles this automatically via Let's Encrypt. This prevents man-in-the-middle attacks between Cloudflare and your server.

3. No changes are needed to Caddy — it already handles Let's Encrypt certificate issuance automatically.

### Edge Certificates

1. Go to **SSL/TLS** → **Edge Certificates**.
2. Enable **Always Use HTTPS** (redirects all HTTP traffic to HTTPS).
3. Enable **Automatic HTTPS Rewrites** (fixes mixed content warnings on pages).

---

## 3. Security Settings

### DNSSEC

1. Go to **DNS** → **Settings**.
2. Click **Enable DNSSEC**.
3. Cloudflare will show you DS record values. Copy them.
4. Log in to your domain registrar and add the DS record to the domain. This step varies by registrar — look for "DNSSEC" in your registrar's DNS management panel.
5. Repeat for each ccTLD domain at its respective registrar.

### Minimum TLS Version

1. Go to **SSL/TLS** → **Edge Certificates**.
2. Under **Minimum TLS Version**, select **TLS 1.2**.

   > TLS 1.0 and 1.1 are deprecated and insecure. Setting minimum to 1.2 drops support for very old browsers (pre-2016), which is acceptable for a news platform.

### HSTS (HTTP Strict Transport Security)

1. Go to **SSL/TLS** → **Edge Certificates**.
2. Click **Enable HSTS**.
3. Set the following:
   - **Max Age**: 6 months (15768000 seconds) — start here; increase to 1 year after confirming HTTPS works everywhere
   - **Apply HSTS policy to subdomains**: On (only if all subdomains use HTTPS)
   - **No-Sniff Header**: On
   - **Preload**: Off (enable later after testing — once preloaded, removal is very slow)
4. Click **Save**.

---

## 4. Domain Redirect Rules

Each ccTLD domain must redirect to the correct path on propertyhack.com. Do this for each ccTLD in its own Cloudflare site.

### propertyhack.com.au → propertyhack.com/au

1. In Cloudflare, open the **propertyhack.com.au** site.
2. Go to **Rules** → **Redirect Rules**.
3. Click **Create Rule**.
4. Set the rule as follows:

   - **Rule name**: Redirect to .com/au
   - **When incoming requests match**: Custom filter expression
   - **Field**: Hostname, **Operator**: equals, **Value**: `propertyhack.com.au`
   - **Then**: Dynamic redirect
   - **Expression**: `concat("https://propertyhack.com/au", http.request.uri.path)`
   - **Status code**: 301

5. Click **Deploy**.

### propertyhack.au → propertyhack.com/au

1. In Cloudflare, open the **propertyhack.au** site.
2. Go to **Rules** → **Redirect Rules** → **Create Rule**.
3. Set:

   - **Rule name**: Redirect to .com/au
   - **Expression**: `concat("https://propertyhack.com/au", http.request.uri.path)`
   - **Status code**: 301

4. Click **Deploy**.

### propertyhack.co.uk → propertyhack.com/uk

1. In Cloudflare, open the **propertyhack.co.uk** site.
2. Go to **Rules** → **Redirect Rules** → **Create Rule**.
3. Set:

   - **Rule name**: Redirect to .com/uk
   - **Expression**: `concat("https://propertyhack.com/uk", http.request.uri.path)`
   - **Status code**: 301

4. Click **Deploy**.

### propertyhack.co → propertyhack.com

1. In Cloudflare, open the **propertyhack.co** site.
2. Go to **Rules** → **Redirect Rules** → **Create Rule**.
3. Set:

   - **Rule name**: Redirect to .com
   - **Expression**: `concat("https://propertyhack.com", http.request.uri.path)`
   - **Status code**: 301

4. Click **Deploy**.

### propertyhack.app → propertyhack.com

1. In Cloudflare, open the **propertyhack.app** site.
2. Go to **Rules** → **Redirect Rules** → **Create Rule**.
3. Set:

   - **Rule name**: Redirect to .com
   - **Expression**: `concat("https://propertyhack.com", http.request.uri.path)`
   - **Status code**: 301

4. Click **Deploy**.

---

## 5. Cache Rules

The server sets `Cache-Control` headers on API responses. Cloudflare respects these by default for most routes. Use Cache Rules to fine-tune edge caching behaviour.

All Cache Rules are configured in **propertyhack.com** → **Rules** → **Cache Rules**.

### Rule 1: Bypass cache for admin routes

1. Click **Create Rule**.
2. **Rule name**: Bypass admin cache
3. **When**: URI Path starts with `/api/admin`
4. **Then**: Bypass cache
5. Click **Deploy**.

### Rule 2: Cache API routes using origin headers

1. Click **Create Rule**.
2. **Rule name**: Cache public API responses
3. **When**: URI Path matches regex `^/api/(articles|locations|categories|markets)`
4. **Then**: Eligible for cache, **Cache TTL** → **Respect origin**

   > "Respect origin" means Cloudflare uses the `Cache-Control: s-maxage=...` header your server sends. Article lists cache for 5 minutes, article detail for 1 hour, locations/markets/categories for 24 hours.

5. Click **Deploy**.

### Rule 3: Long-lived cache for static assets

1. Click **Create Rule**.
2. **Rule name**: Cache static assets
3. **When**: URI Path matches regex `\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|webp)$`
4. **Then**: Eligible for cache, **Edge TTL** → **Override origin** → 30 days (2592000 seconds), **Browser TTL** → **Override origin** → 1 day
5. Click **Deploy**.

### Rule order

Drag rules so they execute in this order:

1. Bypass admin cache (most specific — must run first)
2. Cache public API responses
3. Cache static assets

---

## 6. Caddyfile Update (Server Side)

After enabling Cloudflare proxy, update your `Caddyfile` on the VPS so Caddy trusts Cloudflare's forwarded IP headers. Without this, your server logs will show Cloudflare IP addresses instead of real visitor IPs.

Open `/etc/caddy/Caddyfile` (or the Caddyfile in your project root) and add `trusted_proxies cloudflare` inside the site block:

```
propertyhack.com {
    trusted_proxies cloudflare

    # ... rest of your config
}
```

Caddy has built-in support for Cloudflare's IP range list via the `cloudflare` keyword. After editing, reload Caddy:

```bash
sudo systemctl reload caddy
# or, if using Docker Compose:
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```

---

## 7. Verification

After completing setup, verify everything is working correctly.

### Check that Cloudflare is proxying traffic

Run this in your terminal, replacing the URL with your site:

```bash
curl -I https://propertyhack.com
```

Look for the `CF-Ray` header in the response. Its presence confirms traffic is going through Cloudflare.

### Check that caching is working

```bash
curl -I https://propertyhack.com/api/articles
```

Look for the `CF-Cache-Status` header:

| Value | Meaning |
|-------|---------|
| `MISS` | First request — not cached yet |
| `HIT` | Served from Cloudflare edge cache |
| `EXPIRED` | Was cached, TTL expired, re-fetched from origin |
| `BYPASS` | Cache bypassed (expected for `/api/admin/*`) |
| `DYNAMIC` | Response is not cacheable (check your Cache-Control headers) |

Run the same curl command twice. The second request should return `CF-Cache-Status: HIT`.

### Check that ccTLD redirects work

```bash
curl -I https://propertyhack.com.au/property-news/sydney
```

You should see `HTTP/1.1 301` and a `Location: https://propertyhack.com/au/property-news/sydney` header.

### Check SSL

```bash
curl -I https://propertyhack.com
```

Confirm the response is `200 OK` (not a certificate error). You can also run:

```bash
openssl s_client -connect propertyhack.com:443 -servername propertyhack.com 2>&1 | grep "Verify return code"
```

Should return `Verify return code: 0 (ok)`.

### Check HSTS

```bash
curl -I https://propertyhack.com
```

Look for the `Strict-Transport-Security` header in the response. Example:

```
Strict-Transport-Security: max-age=15768000; includeSubDomains
```

---

## Summary Checklist

- [ ] propertyhack.com added to Cloudflare, nameservers updated at registrar
- [ ] A/AAAA records for `@` and `www` pointing to Sydney VPS IP, proxied (orange cloud)
- [ ] Each ccTLD domain added to Cloudflare and nameservers updated
- [ ] SSL mode set to **Full (Strict)**
- [ ] Always Use HTTPS enabled
- [ ] DNSSEC enabled on propertyhack.com and each ccTLD
- [ ] Minimum TLS version set to 1.2
- [ ] HSTS enabled (start with 6-month max-age)
- [ ] Redirect Rule created for each ccTLD → propertyhack.com
- [ ] Cache Rule: bypass for `/api/admin/*`
- [ ] Cache Rule: respect origin for `/api/(articles|locations|categories|markets)`
- [ ] Cache Rule: long-lived for static assets
- [ ] `trusted_proxies cloudflare` added to Caddyfile, Caddy reloaded
- [ ] CF-Cache-Status: HIT confirmed on second request to `/api/articles`
- [ ] 301 redirect confirmed for at least one ccTLD
