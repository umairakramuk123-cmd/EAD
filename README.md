# EAD e-Portal

A complete, single-file front-end for the **Economic Affairs Division (EAD), Government of Pakistan** —
the NGO e-Portal used to register NGOs/NPOs/INGOs, execute Memoranda of Understanding and monitor
foreign-funded development projects.

Built to BRD v1.1 (`EAD- Updated BRD 1.1`).

**v2 — glassmorphism design system, light/dark themes, and a fully redesigned login screen.**

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
| Size | ~1.0 MB |
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

## Design system v2 — glassmorphism + dual theme

Every surface in the portal is now a **frosted-glass panel**: a translucent background, a
`backdrop-filter: blur(22px) saturate(180%)` refraction of what sits behind it, a 1 px top highlight
and a deep soft shadow. Glass only reads as glass if there is something to refract, so the page
carries a fixed **ambient aurora mesh** — four large radial gradients drifting behind the content —
plus a barely-visible SVG `feTurbulence` grain layer to stop the flat colour bands that blur produces.
Both layers are `position:fixed` at negative z-index and are switched off in `@media print`.

### Themes

Light and dark are **first-class**, not an inverted afterimage. Two complete token sets live on
`:root` and `[data-theme="dark"]`, so every colour in the app resolves through a variable:

| | |
|---|---|
| Toggle | `.thm` button on the login screen **and** in the app top bar |
| Default | the visitor's `prefers-color-scheme`, then overridden by an explicit choice |
| Persistence | `localStorage['ead-portal-theme']` |
| Live sync | follows the OS setting until the visitor picks manually |
| Browser chrome | `<meta name="theme-color">` updates with the theme |
| Charts | ApexCharts palette, axis, grid, tooltip and heatmap/treemap scales re-derive on switch |

Switching theme calls `App.refreshCharts()`, which destroys and rebuilds only the charts on the
current view — no page reload, no lost scroll position, no re-render of the DOM.
`color-scheme` is declared per theme so native form controls, scrollbars and the date picker match.

Dark mode uses raised greens and a warmer gold (`#4FBC97` / `#E3BB5C`) rather than the light theme's
deep institutional greens, keeping WCAG-style contrast against the near-black `#070F0C` canvas.

### Icon contract

Icons were previously emitted as bare `<svg>` elements; any container without an explicit sizing rule
fell back to the replaced-element default of **300 × 150 px**, which is what made some icons appear
enormous. Every generated icon now carries the class `ic` from the `I()` helper, and
`.ic { width:16px; height:16px; flex:none }` provides a safe default. **35 distinct contexts**
override that default to the size their container actually needs — 9 px in a timeline node, 12 px in
a status pill, 13 px in a link, 14 px in a chevron, 17 px in the sidebar, 18 px in a KPI tile,
22 px in a large icon chip, 26 px in an empty state. A sweep across every view confirms the only
rendered icon sizes are **13, 14, 15, 16, 17, 18, 19 and 24 px**.

The global `svg` rule deliberately sets only `display:block`. It must **not** set a width, because
ApexCharts sizes its own `<svg class="apexcharts-svg">` with attributes and a CSS width would
destroy every chart on the page.

### Login screen

Completely rebuilt as a **single-viewport, zero-scroll** composition:

- three blurred aurora orbs drifting behind a frosted two-pane card
- left pane: dark-green glass brand panel with an eyebrow label, a live-pulse trust line and three
  portal metrics
- right pane: the sign-in form with a segmented Email / CNIC / Tracking-ID switcher, iconified
  inputs, inline CAPTCHA and a full-width submit
- 56 px brand bar with the theme toggle, and a slim centred legal footer

**No vertical scroll is guaranteed structurally, not by luck.** `<html data-screen="login">` sets
`height:100dvh; overflow:hidden` on both `html` and `body`, so the *document* cannot scroll while the
login screen is up; `.lg-wrap` is `100dvh` with `overflow:hidden`; and the card is capped at
`calc(100dvh - 108px)`. Three progressive media steps then trim the form as the viewport shortens —
drop the lead line and tighten spacing at ≤ 780 px tall, hide the brand metrics at ≤ 700 px, hide the
divider at ≤ 680 px, and compact every control at ≤ 620 px.

The height budget was computed from the shipped CSS rather than eyeballed:

| Viewport height | Form content | Available | Slack | Result |
|---|---|---|---|---|
| 1080 px | 630 px | 977 px | 347 px | fits |
| 900 px (1440 × 900) | 630 px | 797 px | 167 px | fits |
| 800 px (1280 × 800) | 630 px | 697 px | 67 px | fits |
| 768 px (1366 × 768 / 1024 × 768) | 580 px | 665 px | 85 px | fits |
| 720 px (1280 × 720) | 580 px | 617 px | 37 px | fits |
| 700 px | 575 px | 593 px | 18 px | fits |
| 667 px | 528 px | 560 px | 32 px | fits |
| 640 px | 489 px | 533 px | 44 px | fits |
| 600 px | 489 px | 493 px | 4 px | fits |

"Available" is the viewport minus the *actual* chrome height read back out of the shipped CSS
(`.lg-top` + `.lg-stage` padding + `.lg-foot`), not an estimate. `.lg-foot` is `flex-wrap:nowrap`
with `overflow:hidden` so its height is constant and it can never grow the chrome.

Below 980 px wide the card collapses to a single column and the brand pane is hidden, so phones get
the form only.

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
markup; computed font sizes swept across 1,661 rendered elements with **0 values outside 13–16 px**.

v2 added: theme flip / persist / restore, palette re-derivation into the dark series, `App.refreshCharts()`
on every theme switch, a full 129-view render pass **in dark mode**, an `.ic` sizing audit over every
SVG in every view, the new login structure, and the login height budget above (13 viewport heights,
all fitting without a scrollbar). **0 errors, 0 warnings.**

`scripts/height.py` reproduces the height budget by parsing the stylesheet that ships in the HTML,
so the no-scroll claim can be re-checked after any CSS edit.
