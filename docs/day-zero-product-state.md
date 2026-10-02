# Day Zero — product state
Updated: 2026-10-02 (ET) — v1 cut Locked by Product Architect under CEO LOCK (Chief).
Owner: Product Architect. Repo: https://github.com/ne0c0der/jogobytes (NOT employee-os).
Locking rule: recommend freely; mark major decisions Locked only after Jorge/Chief approval. Keep Inferred separate.

## What this is
**Day Zero** is an agent-native **status page** product (Scout #1 shortlist). Teams publish a public status page, components, and incidents; agents update via API with human draft→publish gates. **jogobytes** is the open build lab and **customer zero**: its own status page ships from this same repo and auto-deploys to jogobytes.com.

Not Employee OS. Do not mix repos, schemas, or issues.

## Thesis (Locked — CEO via Chief 2026-10-02)
Trust-first status: open build, own status live early, agents can operate the page with audited human approval. Narrow status + incident communication — **not** a Better Stack / Datadog monitoring clone.

## ICP (Inferred from Scout — not a pricing lock)
B2B SaaS / API companies and indie founders who need a credible public status surface. Buyer = eng/ops lead or founder; self-serve.

## v1 scope (Locked — Architect 2026-10-02, aligned Scout ship list + Chief)
**Ship in v1:**
1. **Dogfood status** for jogobytes itself (public page live early from this repo).
2. **Auth** (owner account) + **one project / status page** per owner in free v1.
3. **Public status page** with overall status + **components** (operational / degraded / major outage / maintenance).
4. **Incidents:** create / update / resolve; public timeline.
5. **Draft vs publish:** agent (or human) can draft; publish requires explicit owner approval (Ask gate). Published updates are what subscribers and the public page see.
6. **Email subscribers** for incident create/update/resolve (free Resend or equivalent; escalate Chief before paid).
7. **Custom domain path** (DNS instructions + verify) so a customer can point `status.theirdomain.com`.
8. **REST API + agent token** (scoped, revocable) + **signed webhooks** for status/incident events.
9. **Freemium limits** (soft caps in code; exact paid prices **not Locked** — escalate Jorge before charging).

**Defer (Locked out of v1):**
- Full synthetic monitoring fleet / multi-region checks
- On-call / phone trees / PagerDuty replacement
- SSO / SAML
- Private status pages as a paid cliff feature
- White-label / remove branding as a surprise add-on
- MCP server (REST + agent token first; MCP later if demanded)
- SMS subscriber channel
- Multi-page / multi-team enterprise admin

## Acceptance — v1 done when
1. `status.jogobytes.com` (or `/status` on jogobytes.com if subdomain blocked) is live, public, and operated from this repo.
2. An owner can create components and publish an incident through UI; page updates; email subscribers get the update.
3. An agent token can draft an incident via REST; publish still requires owner approval; after publish, public page + subscribers update.
4. Custom domain path works for at least one test domain (can be a free subdomain of jogobytes if needed for demo).
5. No paid vendor spend without prior Chief escalate. Prefer Cloudflare free + Resend free.
6. Architect Pass on dogfood public path + agent draft/publish path; Chief clearance to call “v1 shipped.”

## Kill criteria (Locked — from Scout; re-check at 90 days)
Abandon or hard pivot if:
- 90 days post-launch: **<10** teams with a live custom-domain status page
- Free→paid conversion **<1%** after **200+** free pages
- Support load requires humans writing customer incidents (breaks self-serve)
- Better Stack / Hyperping free tiers make paid conversion impossible at our eventual price (test before locking paid SKU)

## Budget (Locked — Jorge via Chief 2026-10-02)
Ops envelope ~**$100–200/mo** company-wide playground; Jorge buys extra compute/distribution. Prefer free tiers. **Flag any spend before commit.**

## Tech shape (Inferred recommendation — Jason may choose within free tiers)
Prefer staying on **Cloudflare Pages/Workers** (site already deploys there) + free durable store (D1/KV) + **Resend free** for subscriber email. Next.js + Postgres only if free tiers cover it and dogfood stays on jogobytes.com auto-deploy. No paid monitoring SaaS. Escalate Chief before Stripe live charges.

## Domain strategy (needs CEO if changing)
- **Dogfood (Locked for start):** status on jogobytes — prefer `status.jogobytes.com`; fallback `/status` on apex if DNS friction.
- **Customer product brand / apex domain** (dayzero.* vs stay under jogobytes): **not Locked** — escalate Jorge/Chief before buying a domain or public marketing rename.
- **Customer custom domains:** in v1 as a path (DNS + verify), not as a paid-only cliff.

## Pricing / brand packaging (needs CEO)
Ship free usable page first. Monetize only after **≥10** teams used a free page for a real incident (Scout trust path). Exact prices, plan names, and branding (“Day Zero” marketing site vs jogobytes-only) → **CEO decision**. Do not hard-code paid checkout until then.

## Process
- Repo: `ne0c0der/jogobytes` only.
- Workflow: scoped issue → branch → draft PR → Architect QA (dogfood + agent path) → Chief merge clearance. No self-merge.
- Evidence: `docs/qa/pr-<N>/architect-qa-YYYY-MM-DD/` when Architect QA runs.
- Keep Employee OS / ne0bench work out of this repo.

## Build order (Jason)
1. **DZ-0** Dogfood public status surface live (components + manual incident publish) — trust path.
2. **DZ-1** Owner auth + project model + admin UI for components/status.
3. **DZ-2** Incidents create/update/resolve + draft vs publish gate.
4. **DZ-3** Email subscribers (Resend free; escalate if paid).
5. **DZ-4** REST API + agent token + signed webhooks (draft allowed; publish still Ask).
6. **DZ-5** Custom domain path (DNS verify).

## Open CEO / Chief decisions (do not block DZ-0)
- Pricing brand / paid SKU numbers
- Whether to buy a Day Zero apex domain
- Any spend beyond free CF/Resend

## Evidence base (Scout)
Primary packet: `/workspace/jogobytes-money-ideas-2026.md` (#1 Agent-native Status Pages). Key primary sources cited there: Instatus open stats, Instatus pricing, Atlassian Statuspage pricing, Hyperping, Better Stack pricing (fetched ~2026-10-01).
