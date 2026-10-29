# CourseChic Architecture

## Overview

CourseChic is a multi-tenant online course platform with three main product surfaces:

- Owner workspace: platform owner manages tutor tenants, pricing policy, promotions, billing model, and platform-wide operations.
- Tutor workspace: each tutor manages courses, students, workspace pricing, promotions, coupons, landing pages, and learning content.
- Student/public surface: students browse public landing pages, enroll, pay, and consume purchased courses.

The system is designed so commerce and pricing data live in PostgreSQL, not browser local storage, so every machine sees the same state.

## Product Domains

### 1. Platform Owner

Owner controls platform-level business policy:

- onboard tutor tenants
- choose tutor contract model
  - monthly subscription
  - revenue share from tutor course sales
- define default pricing packages
- define default promo policy
- override pricing/promo per tutor workspace

Owner surface currently lives in:

- `/growth`
- `educator-web` with owner mode

### 2. Tutor Workspace

Tutor controls the education business inside one tenant:

- course creation and curriculum tree
- lesson media, transcript, downloadable files, assignments
- workspace pricing defaults
- course pricing overrides
- promotions and coupon formats
- students, enrollments, orders
- landing page / public site content

Tutor surface currently lives in:

- `/educator`
- `educator-web` with tutor mode

### 3. Student + Public Surface

This has two parts:

- public landing page per tenant subdomain
  - example: `tutortan.coursechic.com`
- student learning application
  - `/student`

Public landing is served by backend HTML routing using subdomain resolution.
Student application is served by `student-web`.

## Runtime Topology

### HTTP Services

- `3000`: Express backend
  - REST APIs
  - tenant landing page routing
  - static public assets
- `3001`: Nest backend
  - newer course/media/application APIs
- `3100`: `educator-web` Next.js app
  - `/educator`
  - `/growth`
- `3101`: `student-web` Next.js app
  - `/student`

### Nginx Routing

Main nginx behavior:

- `/_next/` -> `3100`
- `/educator` -> `3100`
- `/growth` -> `3100`
- `/student` -> `3101`
- `/api/nest` -> `3001`
- `/` -> `3000`

Important implication:

- the root subdomain page like `tutortan.coursechic.com/` is not served by Next.js
- it is served by the Express backend landing-page resolver

## Data Model Strategy

### Multi-tenant Core

Key tenant concepts:

- `organization`: tenant/workspace identity
- `tenantMembership`: user membership inside tenant
- `license`: tenant commercial package and metadata
- `tutorBillingProfile`: who collects payment and under what model

### Commerce Storage

Commerce now has three layers:

1. Platform defaults
   - stored in `PlatformPricingConfig.payload`
2. Workspace commerce defaults
   - stored in `License.metadata.workspaceCommerce`
3. Course-specific pricing
   - stored at course pricing layer

This separation lets the system support:

- platform-wide default package policy
- workspace-level default pricing before courses exist
- per-course overrides after tutor creates real products

## Billing Models

Tutor contracts with the platform support two models:

### Monthly Subscription

- tutor pays CourseChic monthly
- tutor is responsible for receiving money from students
- tutor manages student account opening and payment flow on their side

### Revenue Share

- platform receives payment from tutor students
- platform takes agreed percentage from tutor course sales
- platform handles payment collection flow for that tutor

This model selection should always affect:

- checkout owner
- billing profile
- payout/reporting logic
- tutor admin workflow

## Commerce Capabilities

Workspace commerce is designed to support more than one record per area.

### Pricing

Workspace pricing supports multiple duration options:

- `1`
- `3`
- `6`
- `12`
- `18`
- `24`
- `30`
- `36`
- `lifetime`

Each duration can define:

- enabled
- price
- compare-at price

### Promotions

Workspace promotions support multiple campaigns, each with:

- label
- duration binding
- discount percent
- note
- enabled

### Coupons

Workspace coupons support multiple formats:

- percent
- fixed amount
- free months

Each coupon can bind to a duration and be enabled/disabled independently.

## Content + Learning Stack

Current course/lesson architecture supports:

- nested content structure
  - section
  - lesson
  - deeper hierarchy
- video assets
- transcript segments
- downloadable files
- assignment files
- course publishing state

Target learning features from product direction:

- PDF and link downloads
- playback speed control
- transcript click-to-seek
- picture-in-picture
- AI Q&A
- lesson summaries
- extra exercises
- AI study planning
- reminders and scheduled study sessions
- web + iOS + Android clients

## Public Landing Page Flow

Public landing page resolution is subdomain-based:

1. backend reads subdomain from `Host`
2. resolves `organization.slug`
3. serves:
   - tenant landing page HTML from `backend/uploads/landing-pages/<slug>/index.html`
   - or default generated landing page if tenant page does not exist

Commerce sync on public page:

- public page can fetch `/api/public/commerce`
- backend resolves tenant from host
- backend loads `License.metadata.workspaceCommerce`
- backend normalizes payload before response

This allows the public site to show real workspace pricing from PostgreSQL instead of hardcoded HTML values.

## Frontend State Rules

### Required Rule

Do not store commerce source-of-truth in browser local storage.

Allowed:

- session cache for auth convenience
- non-critical UI preferences

Not allowed:

- authoritative workspace pricing
- promotion presets
- coupon definitions

Reason:

- tutors may use multiple devices
- owner may review same tenant from another machine
- browser-local presets cause split state and stale admin views

## Current Risks

- landing pages are still HTML files, so content structure is harder to keep consistent than React-rendered pages
- two backend stacks exist (`Express` and `Nest`), so domain ownership must stay explicit
- root domain and `/educator` do not run on the same app, which can confuse debugging if path is not identified first

## Recommended Next Steps

1. Move public landing pages toward structured templates backed by DB content blocks, not ad hoc HTML only.
2. Add explicit public commerce widgets for:
   - active duration
   - compare-at price
   - active promotions
   - visible coupons
3. Add payout/accounting model docs for monthly vs revenue-share tutors.
4. Add mobile architecture notes for iOS/Android parity.
5. Consolidate health/debug endpoints per surface so route ownership is obvious during incident debugging.
