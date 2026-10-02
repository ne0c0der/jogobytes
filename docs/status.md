# jogobytes status (DZ-0)

Public URL: <https://jogobytes.com/status>

`status.jogobytes.com` is not attached in this change. jogobytes.com already auto-deploys from `main` on Cloudflare Pages (DNS is on Cloudflare: `holly.ns.cloudflare.com` / `moura.ns.cloudflare.com`). This repo has no Cloudflare API token, so the subdomain cannot be created from the repo alone. Attaching it is a $0 Cloudflare step: Pages project → Custom domains → `status.jogobytes.com`. Do not buy anything. Until that domain exists, the status surface is `/status` on the apex.

## What is public

- Overall status, derived from the components.
- Components: Website, API, Builds. Each is operational, degraded, major outage, or maintenance.
- Incident history. The shipped `status/status.json` includes one published incident, "Public status page opened".

## How the owner changes status

1. Open <https://jogobytes.com/status/admin> after this change is on `main`.
2. Paste a GitHub fine-grained personal access token with Contents read and write on `ne0c0der/jogobytes`. The token stays in that browser tab (`sessionStorage`) and is sent only to `api.github.com`.
3. Set component statuses and, if needed, write an incident title, update, and state.
4. Publish. The admin commits `status/status.json` to `main`. The existing Cloudflare Pages auto-deploy refreshes <https://jogobytes.com/status>.

Leave the incident fields blank to publish a component change only.

Fallback with no token in the browser: edit `status/status.json` on `main` and push. Same file, same deploy.

## Checks

```bash
node --test status/model.test.mjs
```

## Architect QA

After merge, the live public URL is <https://jogobytes.com/status>. Confirm it on a phone-width viewport and a desktop viewport: three components, overall status, and the published incident. Owner path is <https://jogobytes.com/status/admin>. No paid vendor is required for this slice.
