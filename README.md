# EAD e-Portal

A complete, single-file front-end for the **Economic Affairs Division (EAD), Government of Pakistan** —
the NGO e-Portal used to register NGOs/NPOs/INGOs, execute Memoranda of Understanding and monitor
foreign-funded development projects.

The PDF named `EAD- Updated BRD 1.1` has not reached this workspace. The current portal was built
from the public EAD NGO Policy and Registration Procedure Guide; **BRD compliance cannot be claimed
until the BRD is readable.** See [`BRD-RECONCILIATION.md`](BRD-RECONCILIATION.md) for the source map and
for roles, modules and actions still needing verification.

**v2 — glassmorphism design system, light/dark themes, and a fully redesigned login screen.**

**v3–v5 — sidebar, accessibility, chart and surface-design improvements.** The command palette,
icon-rail collapse, role-aware quick action, financial-year selector, CSV export and density toggle
were later removed as unverified actions.

**v6 — scope trim:** removed those unverified shell/table/report actions while retaining the visual
upgrades previously requested. The complete BRD-specific role/module/workflow reconciliation remains
blocked on the missing PDF.

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
| Size | ~1.04 MB |
| External requests | 0 |
| Font | Manrope only, 400/500/600/700/800 |
| Type scale | Hard-constrained to 13–16 px (13 / 14 / 15 / 16 only) |
| Charts | ApexCharts — 50 chart definitions across 8 types |

## Current scope (v6)

Visual upgrades remain: glassmorphism, dark/light theme, redesigned login, floating sidebar, charts,
and accessibility improvements. To avoid adding unverified actions, the current HTML no longer has a
command palette, sidebar quick-action/rail-collapse controls, financial-year selector, fake refresh,
CSV export, density toggle, custom-report builder, or half-yearly reporting option. The topbar keeps record search, the requested
theme switch, and account/notification controls.

This is a **provisional source-based portal, not a BRD-verified implementation**. Eight role labels and
seven modules in the current 13-role / 16-module set are marked as inferred in
[`BRD-RECONCILIATION.md`](BRD-RECONCILIATION.md). Do not treat them as BRD requirements until the
source document is available.

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

## Historical design notes — v3 shell

> **Current-state note (v6):** The command palette, quick-action button, icon-rail collapse and related
> hotkeys described below have been removed because they were not verified against the missing BRD.
> This section documents the earlier iteration only; it is not a list of current actions.

### Sidebar

The sidebar is no longer a full-height slab bolted to the left edge. It is a **detached, rounded glass
rail** floating `14px` in from the top, bottom and left, with its own interior light (a green bloom
top-left, a gold ember bottom-right), a hairline specular edge, and a deep cast shadow.

It now carries, top to bottom: the brand crest, a **role-aware gold quick-action button**
("New MoU application" for EAD staff, "Continue application" for NGOs, "Review clearance requests"
for MoI, "Upload audited accounts" for auditors, and so on), the grouped module nav, a live system
status line, the identity card, and a **collapse control**.

**Icon-rail mode** — the collapse button shrinks the rail to 78px, keeping only icons, badges and the
avatar, with native tooltips on every item. The preference persists in
`localStorage['ead-portal-rail']` and is restored on sign-in. Charts are told to re-measure after the
width transition settles, so nothing is left stretched. Below 1080px the rail becomes a slide-in
drawer with a blurred backdrop and rail mode is switched off automatically.

Active items get a gradient pill, a gold icon and an animated gold capsule marker that scales in.

### Command palette

`⌘K` / `Ctrl+K` / `/` opens a full command palette — the single biggest interaction upgrade:

- **Commands** — toggle theme, collapse the sidebar, change financial year, re-sync data, print, help, sign out
- **Modules** — every module the *current role* is actually permitted to open, with its description
- **Records** — NGOs, MoU applications, MoUs, projects and clearance requests, each **deep-linking
  straight into its detail view** rather than just navigating to the module

Ranking is scored (exact › prefix › word-start › substring › subsequence, length- and position-weighted),
results are grouped and capped, and the whole thing is keyboard-driven: `↑`/`↓`/`Tab` to move,
`↵` to run, `Esc` to dismiss. Record groups only appear for roles that may see them.

### Nothing overlaps — proved, not assumed

No browser exists in this sandbox, so `scripts/overlap-audit.py` proves the layout **geometrically**
by parsing the stylesheet that actually ships and rebuilding the box model of every fixed, sticky and
absolutely-positioned layer. It also asserts that each rule it models is still present, so editing the
CSS without updating the model fails loudly instead of passing a stale claim. **The v3 release had 49 checks, 0 failures:**

| Area | What is proved |
|---|---|
| Gutter | sidebar right edge 280px vs content left edge 294px (14px clear); rail 92px vs 106px |
| Drawer | below 1080px the content margin is released to 0 and the rail parks fully off-screen |
| Topbar | minimum content width fits its column at **every** width from 320px to 1920px, across 16 breakpoints |
| Shrink | crumb, command trigger and role picker all carry `min-width:0`, so the row compresses instead of overflowing |
| z-index | one contract, no two shell layers share a level: ambient −2/−1 · sticky head 3 · topbar 70 · backdrop 79 · sidebar 80 · modal 200 · drawer 201 · **palette 250** · context menu 300 · toasts 400 |
| Sticky | the sticky table head offsets by `var(--tb-h)` so it can never slide under the sticky topbar |
| Overlays | dropdowns, modal, drawer, palette and toasts are all viewport-clamped; on phones menus anchor right |
| Dark mode | no hardcoded light *surface* survives (luminance-tested; badges, control knobs and print excluded) |
| Type scale | every literal `font-size`, every `--fs-*` token and every ApexCharts `fontSize` is within 13–16px |

Bugs this audit found and that are now fixed: the topbar's dropdowns were trapped inside the topbar's
own stacking context (`z-index:50`) so the sidebar could paint over them; the app footer, a view card
and the context menu used hardcoded light backgrounds that stayed white in dark mode; four dropdowns
had inline `min-width` values that could exceed a 320px viewport; a `font-size:0` text-hiding hack in
rail mode registered as a type-scale violation; and a `22px` login heading override broke the 13–16px
constraint.

## Historical enhancements v4 — sparklines, table tools, accessibility

> **Current-state note (v6):** KPI sparklines, counters and accessibility improvements remain. The
> CSV export and compact-density controls described below were removed; the older tests in this
> historical narrative were replaced by assertions that those controls are absent.

### KPI tiles are alive

Every KPI tile now carries a **12-point sparkline** in the tile's own accent colour, rendered by
ApexCharts in `sparkline` mode (no axes, no tooltip, no chrome — just the trend). The series is
**hash-seeded from the tile's label**, so a given metric draws the identical curve on every reload and
never advances the demo-data PRNG, and its slope follows the direction of the tile's delta: a `+12%`
tile trends up, a `−8%` tile trends down.

The headline number **counts up** from zero on an eased 760 ms curve whenever the value is numeric
(`nf()`-formatted with tabular figures so the digits do not jitter). Non-numeric values such as
`$16.9B`, `PKR 1.2B` or `94%` are detected and left untouched rather than mangled. Both effects are
suppressed under `prefers-reduced-motion`.

### Table controls

A tools cluster is **injected into every `.tbar`** after render, so all five data views — and any table
added later — get it for free without touching a single view:

- **Density toggle** — comfortable (10px cell padding) or compact (5px), persisted to
  `localStorage['ead-portal-density']`, announced through `aria-pressed`, and it tells ApexCharts to
  re-measure once the reflow settles.
- **CSV export** — serialises the table exactly as filtered and sorted on screen, with a BOM so Excel
  opens UTF-8 correctly, RFC-4180 quoting, and a filename derived from the panel title and financial
  year. Falls back to a `data:` URI where `URL.createObjectURL` is unavailable, warns instead of
  writing a blank file when the current filter has no rows, and confirms the exact row count.

### Accessibility

- **Skip link** — first focusable element in the document, parked off-screen until focused, targeting `#view`
- **Landmarks** — `role="main"` on the content region, `aria-label` on the sidebar nav, dialog semantics on the modal and the palette
- **Live region** — toasts are `role="status"` with `aria-live="polite"`
- **`aria-current="page"`** tracks the active module on every navigation, not just on sign-in
- **`aria-expanded`** is kept truthful on all four topbar dropdown triggers
- **Focus management** — opening a modal stores the trigger, moves focus to the first control
  (the Close button), **traps Tab and Shift+Tab inside the overlay**, and returns focus on close
- `.sr-only` utility for text that should be read but not seen

### Motion and lifecycle

Views enter on a 320 ms opacity + 7 px rise. It deliberately uses **translate and opacity only, never
scale**, because a scale transform would change what ApexCharts measures in its containers.

Chart lifecycle is hardened: `render()` returns a Promise that rejects on empty data or an unsupported
environment, and that rejection escapes any synchronous `try/catch` — under Node 22 it aborts the
process outright. All three creation sites now attach a `.catch()`, so a chart that cannot draw logs a
warning instead of throwing an unhandled rejection in the client's console.

## Refinement layer v5 — one depth language across the whole portal

v2–v4 redesigned the shell, the login and the data surfaces, but the component shadows were still
ad-hoc literals written per rule — `0 2px 10px rgba(10,77,56,.30)` here, `0 16px 40px` there. v5
replaces them with a **formal four-step elevation scale** that every surface draws from, so a card,
a modal, a dropdown and a toast now read as the same material at different heights:

| Token | Use | Light | Dark |
|---|---|---|---|
| `--el-1` | controls at rest: buttons, chips, pager, record search | 2-layer, 5% | 34% black |
| `--el-2` | cards, KPI tiles, banners, file rows | 2-layer, 6–10% | 42–48% |
| `--el-3` | dropdowns, toasts, hovered cards | 2-layer, 9–16% | 50–62% |
| `--el-4` | modal and drawer | 2-layer, 18–30% | 64–80% |

Alongside them: `--hi` / `--hi-soft` (the 1px inner specular highlight that makes glass read as a
physical sheet) and `--sheen` (a 168° top-left wash). Every component now gets the same treatment.

### What changed, surface by surface

- **Cards** — specular sheen, `--el-2` at rest, and the first/last child inherits the card's corner
  radius so a full-bleed toolbar, table head or pager can no longer square off the rounded corners.
- **KPI tiles** — the accent edge now casts a glow in its own tone; labels go small-caps with tracked
  letterforms; values use tabular figures.
- **Tables** — the head gets a gradient wash and an inset rule; hovering a row drives a **gold hairline
  down its leading edge** and darkens the primary cell; the sorted column gets a gold underline rather
  than only a brighter caret; keyboard focus gets the same affordance as hover.
- **Forms** — focus now stacks the field ring *and* the tinted `--ring`; an invalid field gives one
  short horizontal nudge; checkboxes, radios and switches get proper cast shadows.
- **Pills** — warning and danger dots pulse slowly so a live exception catches the eye.
- **Progress** — a slow travelling highlight sweeps the filled portion only, so a live figure reads as live.
- **Overlays** — modal, drawer, dropdown and toast share `--el-3`/`--el-4` and the sheen;
  dropdown items slide 2px on hover.
- **Everything else** — timeline nodes, stepper discs, checklist counters, segmented control, list rows,
  stat tiles, icon chips, empty states, code blocks and the page header, each brought onto the same scale.

### Proven not to move anything

A refinement pass is exactly where layouts quietly break, so the constraint is enforced rather than
intended. The layer is **appended last** and declares **no layout property at all** — no width, height,
padding, margin, display, flex, grid, gap, offset, overflow or z-index. Section 9 of
`scripts/overlap-audit.py` parses the layer and fails the build if that ever stops being true:

- no layout property is declared anywhere in the layer
- `position` appears only on the offset-free `.prg > i` wrapper and on out-of-flow pseudo-elements
- `inset` appears only on out-of-flow pseudo-elements
- the layer's keyframes animate **only** `transform` and `opacity`
- every property used is a known surface property or one of the eight new tokens

The only `position` in the layer is `position:relative` on the progress fill — no offsets, still in
flow, same box — added purely to give the sheen a containing block so it is clipped to the filled
portion instead of the whole track.

Because the sheen is applied as `background-image` rather than a `::before` overlay, it paints *with*
the background, underneath content, and can never wash over text or charts. Every animated effect is
disabled under `prefers-reduced-motion`.

## Roles (13; provisional pending the BRD)

Every role has its own sidebar, dashboard, KPI set and write permissions. Switch between them live
from the identity chip in the top bar (a demo control; in production the role is derived from the
account). Source-backed roles and inferred roles are distinguished in
[`BRD-RECONCILIATION.md`](BRD-RECONCILIATION.md).

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

## Modules (16; provisional pending the BRD)

Dashboard · Analytics · MoU Applications · Document Checklist · Security Clearance · MoU Register ·
Projects (APA) · Donors & Funding · Monitoring & Evaluation · NGO Directory · Reports & Statements ·
Notifications · Users & Roles · Audit & System Logs · Settings · Help & FAQs

Plus six authentication screens: **Login** (email / CNIC / tracking-ID modes, CAPTCHA, MFA-ready),
**Signup** (5-step NGO registration wizard), **Forgot password** (3-step email + OTP recovery),
**Track application** (public status search with workflow timeline), **Submission receipt** and a
**public FAQ** page.

## Domain rules encoded from public EAD sources (BRD reconciliation pending)

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

Run all checks with `bash scripts/run-checks.sh`. The current v6 artifact passes:

- Inline JavaScript syntax: **PASS**.
- Headless suite: **129 permitted role × view renders**, 50/50 ApexCharts option builders, modal/auth
  flows, table filters and pagination, basic record search, theme switching, and assertions that the
  removed command palette/table tools are absent — **0 errors / 0 warnings**.
- Computed font sweep: **1,733 elements**, zero values outside 13–16 px.
- Geometric overlap audit: **55 PASS / 0 FAIL** across sidebar/main gutter, 320–1920 px topbar
  widths, stacking order, sticky headers, viewport-clamped overlays, theme surfaces and the v5
  surface-only refinement layer.
- Login height budget: **14 viewport heights** (1080 px down to 600 px), all fit without a vertical
  scrollbar.
- Markup balance and duplicate-ID checks: **PASS**.

The automated suite uses jsdom; there is no real browser binary in this sandbox, so pixel rendering
has not been visually inspected here. Geometry, height budgets and app behavior are tested
programmatically instead.

## BRD status and source provenance

The BRD attachment notification appeared, but the PDF itself was not written into the workspace.
The portal therefore cannot yet be certified against `EAD- Updated BRD 1.1`. The current version
only removes clearly unverified interface/report controls; the 13 roles, 16 modules, data fields,
statuses and workflows still need an exact comparison with the BRD. See
[`BRD-RECONCILIATION.md`](BRD-RECONCILIATION.md). Reattach the PDF or paste the BRD text before
calling this implementation BRD-complete.
