# BRD reconciliation worksheet

Prepared so the portal can be diffed against `EAD- Updated BRD 1.1` the moment that
file is readable. **The PDF has never reached this sandbox** — see "Status" below.

Provenance key:

| Tag | Meaning |
|---|---|
| `[GUIDE]` | traceable to the official *EAD e-Portal Registration Procedure Guide* |
| `[POLICY]` | traceable to the *NGO Policy 2021/2022* on ngo.ead.gov.pk |
| `[INFERRED]` | plausible enterprise design added by me, **not** sourced from an EAD document |
| `[UI-EXTRA]` | added in v3–v5 as interface enhancement, not domain functionality |

---

## Status of the BRD

The upload notification named `/home/user/uploads/EAD- Updated BRD 1.1 (1) (1).pdf`.
That path does not exist, and a whole-filesystem search for `*.pdf` and `*BRD*` returns
nothing. `pdftotext`, `mutool`, `gs`, `qpdf`, `pypdf`, `PyPDF2`, `fitz`, `pdfminer` and
`pdfplumber` are all absent, and `pip install pypdf` is blocked by PEP 668. This is the
second attempt that has not landed.

Everything below is therefore reconciled against the two public EAD sources, not the BRD.

---

## Roles (13)

| Role id | Label | Provenance |
|---|---|---|
| `super_admin` | Super Administrator (IT & Systems Wing) | `[INFERRED]` — no EAD document names an IT admin role |
| `secretary` | Secretary, EAD | `[POLICY]` — competent approving authority |
| `addl_secretary` | Additional Secretary, NGO Wing | `[INFERRED]` — policy names Secretary and one BS-20 officer only |
| `joint_secretary` | Joint Secretary, NGO Wing-I | `[GUIDE]` — signs the MoU "For the Government of the Islamic Republic of Pakistan" |
| `section_officer` | Section Officer, Scrutiny | `[POLICY]` — "scrutinized by an authorized officer" |
| `desk_officer` | Desk Officer / DEO, Record & Receipt | `[INFERRED]` |
| `ngo_admin` | NGO Administrator | `[GUIDE]` — the registering NGO user |
| `ngo_pm` | NGO Project Manager | `[INFERRED]` — Guide mentions project staff, not a portal role |
| `donor` | Donor / Development Partner | `[INFERRED]` — donors are recorded as data, not portal users, in both sources |
| `province` | Provincial Government (BGO) | `[POLICY]` — provinces are processing end users of the BGOs portal |
| `moi` | Security Agency (MoI) | `[POLICY]` — provisional security-agency clearance |
| `auditor` | External Auditor | `[INFERRED]` — policy requires audited accounts *from* a firm, not a portal login |
| `public` | Public / Visitor | `[GUIDE]` — Track Your Application, FAQs, NGOs Information are public |

**6 of 13 roles are my inference.** This is the single largest BRD-dependency in the build.

## Modules (16)

The live `ngo.ead.gov.pk` top-level menu is: Document Checklist · Draft MOU · New
Methodology of Understanding · FAQs · Track Your Application · Notification Events &
Press Releases · NGOs Information · NGOs Policy 2021 · Guidelines.

| Module | Provenance | Note |
|---|---|---|
| `checklist` | `[GUIDE]` | the 13 statutory sections — strongest match in the build |
| `mou` (MoU Register / Draft MoU) | `[GUIDE]` | |
| `applications` | `[GUIDE]` | |
| `clearance` | `[POLICY]` | |
| `ngos` (NGO Directory) | `[GUIDE]` | "NGOs Information" |
| `notifications` | `[GUIDE]` | "Notification Events & Press Releases" |
| `help` (FAQs / Guidelines / Policy) | `[GUIDE]` | collapses three public menu items into one |
| `projects` (APA) | `[GUIDE]` | Annual Plan of Action is checklist section 2 |
| `mne` | `[POLICY]` | quarterly returns, audited accounts, completion reports |
| `reports` | `[INFERRED]` | |
| `donors` | `[INFERRED]` | donor data belongs to Basic Info + APA in the Guide |
| `analytics` | `[INFERRED]` | |
| `users` | `[INFERRED]` | |
| `audit` | `[INFERRED]` | |
| `settings` | `[INFERRED]` | |
| `dashboard` | `[INFERRED]` | Guide says signup leads to a dashboard, so the screen is sourced; its contents are not |

**7 of 16 modules are my inference.**

## Domain actions (things that change a record)

| Action | Provenance |
|---|---|
| Submit the 13-section checklist → status APPLICATION SUBMITTED | `[GUIDE]` |
| Upload signed MoU (the downloaded draft, re-uploaded) | `[GUIDE]` |
| Add organisation e-signature (image ≤ 25 KB) to Draft MoU | `[GUIDE]` |
| Scrutinise an application; issue deficiency | `[POLICY]` — deficiency indicated electronically |
| Approve / reject an application | `[POLICY]` — decided within 60 days by Secretary EAD |
| Request security clearance; agency grants/withholds | `[POLICY]` |
| Sign MoU (6 months, extendable to 2 years) | `[POLICY]` |
| Renew MoU (≤ 2 years, decided at Secretary level) | `[POLICY]` |
| **Revoke** a MoU | `[INFERRED]` — neither source describes revocation, only non-extension |
| Submit quarterly foreign-contribution return | `[POLICY]` |
| Submit annual / half-yearly return | `[INFERRED]` — policy specifies quarterly and annual only |
| Upload audited accounts | `[POLICY]` |
| Upload annual report / completion report | `[POLICY]` |
| Add or edit a project (APA) | `[GUIDE]` — additional projects must be submitted via e-portal |
| Add or edit a donor | `[INFERRED]` |
| Add or edit a portal user; edit role permissions | `[INFERRED]` |
| Broadcast a notification; send reminders | `[INFERRED]` |
| Build a report | `[INFERRED]` |

## UI-layer additions (v3–v5) — no domain meaning

| Feature | Added | Reversible |
|---|---|---|
| Command palette (⌘K / Ctrl+K / `/`) | v3 | yes — remove `Cmd`, the `.cmdk` trigger and `#cmdk-ovl` |
| CSV export per table | v4 | yes — remove `Tools.csv` |
| Row-density toggle | v4 | yes — remove `Tools.density` |
| Sidebar collapse to icon rail | v3 | yes — remove `App.toggleRail` and the `.sb-collapse` button |
| Role-aware sidebar quick action | v3 | yes — remove `.sb-qa` |
| Live demo role switcher | v1 | yes — remove `#dd-role`; role would come from the account |
| Financial-year selector | v1 | yes — remove `#dd-fy` |
| Print current view | v1 | yes — remove the palette command and the `@media print` block |
| KPI sparklines + count-up | v4 | yes — remove `.kpi-spark` and `Spark` |
| Glassmorphism, light/dark themes, elevation scale | v2/v5 | explicitly requested by the client |
| Redesigned login, zero vertical scroll | v2 | explicitly requested by the client |

## Domain rules already encoded (all sourced)

`[GUIDE]` 13-section checklist · Basic Info not editable after submission · 7 MB per file ·
DOC/PDF/XLSX/JPEG/PNG · e-signature ≤ 25 KB · admin cost ≤ 30% of total budget · all currency
in USD with a PKR equivalent · tracking ID `EAD-2026-NGO-004812`.

`[POLICY]` applications ≥ 60 days before commencement · decision within 60 days · deficient
applications not entertained · MoU 6 months extendable to 2 years · MoU ≤ 3 years, renewal ≤ 2
years at Secretary level · bank-to-bank above Rs. 25,000 · Pakistan bank accounts in the NGO's
name intimated to EAD · no work in GoP-restricted areas (U.O. 18/97/1973-PE-II, 21-03-2019) ·
communication only through the portal and registered email.
