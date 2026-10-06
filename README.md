# EAD e-Portal

A complete, single-file front-end for the **Economic Affairs Division (EAD), Government of Pakistan** —
the NGO e-Portal used to register NGOs/NPOs/INGOs, execute Memoranda of Understanding and monitor
foreign-funded development projects.

Built to BRD v1.1 (`EAD- Updated BRD 1.1`).

**Open [`ead-portal.html`](ead-portal.html) directly in any browser.** There is nothing to install,
build or serve.

---

## Self-contained

`ead-portal.html` has **zero external dependencies**. ApexCharts v3.49.2 and all five weights of the
Manrope webfont are inlined (base64 `@font-face`), so the portal renders identically offline and on
networks that block CDNs — which matters for government deployments behind restrictive proxies.

| | |
|---|---|
| File | `ead-portal.html` |
| Size | ~971 KB |
| External requests | 0 |
| Font | Manrope only, 400/500/600/700/800 |
| Type scale | Hard-constrained to 13–16 px (13 / 14 / 15 / 16 only) |
| Charts | ApexCharts — 50 chart definitions across 8 types |

## Colour scheme

Institutional Government-of-Pakistan green with a seal-gold accent, chosen to read as an official
federal system rather than a commercial SaaS product.

- Brand greens `#03231A → #EEF9F3` (sidebar, primary actions, active states)
- Seal gold `#C9A227` (accents, active nav marker, submit/decision actions)
- Semantic: success `#12795A`, info `#1D6FB8`, warning `#A9761A`, danger `#AF3629`
- Neutral surfaces `#F2F6F4` / `#FFFFFF` with `#DEE7E2` hairlines

Because the type scale is capped at 16 px, hierarchy is carried by **weight, colour and spacing**
rather than size — a deliberately dense, record-room-grade information design.

## Roles (13)

Every role has its own sidebar, dashboard, KPI set and write permissions. Switch between them live
from the identity chip in the top bar (a demo control; in production the role is derived from the
account).

| Role | Organisation | Scope |
|---|---|---|
| Super Administrator | EAD — IT & Systems Wing | All 16 modules, users, config, audit |
| Secretary, EAD | Ministry of Economic Affairs | Competent authority — final MoU approval / rejection |
| Additional Secretary | NGO Wing (Foreign Funding) | Wing head, consolidates recommendations |
| Joint Secretary | NGO Wing-I | Signs MoUs on behalf of Secretary |
| Section Officer | NGO Wing-I — Scrutiny | Scrutiny, deficiency, clearance requests |
| Desk Officer / DEO | Record & Receipt Branch | Case receipt, indexing, document verification |
| NGO Administrator | Registered NGO/NPO | Own case, checklist, projects, compliance |
| NGO Project Manager | NGO field office | Project reporting and field returns |
| Donor / Development Partner | e.g. ADB PRM | Own commitments, disbursement, outcomes |
| Provincial Government (BGO) | e.g. P&D Board Punjab | Province-level project visibility |
| Security Agency (MoI) | Ministry of Interior | Clearance requests and decisions |
| External Auditor | Registered audit firm | Audited accounts, third-party evaluation |
| Public / Visitor | Unregistered | Directory, notifications, tracking, FAQs |

## Modules (16)

Dashboard · Analytics · MoU Applications · Document Checklist · Security Clearance · MoU Register ·
Projects (APA) · Donors & Funding · Monitoring & Evaluation · NGO Directory · Reports & Statements ·
Notifications · Users & Roles · Audit & System Logs · Settings · Help & FAQs

Plus six authentication screens: **Login** (email / CNIC / tracking-ID modes, CAPTCHA, MFA-ready),
**Signup** (5-step NGO registration wizard), **Forgot password** (3-step email + OTP recovery),
**Track application** (public status search with workflow timeline), **Submission receipt** and a
**public FAQ** page.

## Domain rules encoded from the BRD / NGO Policy 2022

- 13-section document checklist, Basic Information locked after submission
- 7 MB per upload; DOC, PDF, XLSX, JPEG, PNG; e-signature image max 25 KB
- Applications due ≥ 60 days before project commencement; decision within 60 days
- MoU valid up to 3 years; 6 months on provisional clearance; renewal ≤ 2 years, decided by Secretary
- Administrative cost capped at 30% of total budget (enforced with a chart annotation)
- Bank-to-bank transfer mandatory above Rs. 25,000
- No foreign-funded work in restricted areas
- Quarterly foreign-contribution returns, audited accounts, annual reports, completion reports

## Demo data

All records are generated in-browser from a seeded PRNG, so figures are realistic and **stable across
reloads**. Nothing is persisted and no network calls are made.

Sign-in accepts any password as long as the on-screen CAPTCHA is typed correctly; the role dropdown
selects which workspace you enter.

## Verification

Validated headlessly: 129 role × view renders, all 50 chart builders producing well-formed configs
(with Manrope enforced on chart, axis, legend and tooltip text), every modal, auth flow, filter,
sort, pagination and tab — **0 errors**. Tag balance and structural integrity verified on the
markup; computed font sizes swept across 1,669 rendered elements with **0 values outside 13–16 px**.
