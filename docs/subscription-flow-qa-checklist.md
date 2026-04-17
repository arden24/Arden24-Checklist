# Subscription & routing — manual QA checklist

Use this after code or env changes. Assumes **Supabase + Stripe** are configured and you can complete a test checkout.

**Definitions**

- **Subscribed**: `subscriptions.subscription_status` is `active` or `trialing` (same as `hasActiveAppSubscription` in `lib/supabase/subscription-access.ts`).
- **Middleware** (`lib/supabase/middleware.ts`): unauthenticated users may only hit **public** routes (`/`, `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/auth/callback`, `/api/stripe/*`). **`/start` is not public** — signed-out users are sent to `/sign-in`.
- **Subscription-gated routes**: `/dashboard`, `/journal`, `/strategies`, `/notes`, `/checklist` (and subpaths). **`/account` and `/billing` are not gated by subscription** — only sign-in is required.

---

### 1. Signed-out user tries to access `/dashboard`

| | |
|---|---|
| **Starting state** | Browser signed out (no session cookies). |
| **Steps** | Open `/dashboard` (or click a deep link to it). |
| **Expected** | Redirect to `/sign-in`. |
| **Bug signals** | Dashboard renders; infinite redirect; wrong redirect path. |

---

### 2. Signed-out user tries to access `/start`

| | |
|---|---|
| **Starting state** | Signed out. |
| **Steps** | Open `/start` (plain URL, no query). |
| **Expected** | Redirect to `/sign-in` (because `/start` is not in the public route list). |
| **Bug signals** | Marketing/plan page visible while signed out (unless you intentionally changed middleware). |

---

### 3. New user signs up, signs in, and has no subscription

| | |
|---|---|
| **Starting state** | No account, or a test account with **no** `subscriptions` row (or non-active status). |
| **Steps** | Sign up → complete email if required → sign in. |
| **Expected** | After successful auth on `/sign-in` or `/sign-up`, middleware redirects to **`/start`** (search cleared), not `/dashboard`. |
| **Bug signals** | Land on `/dashboard` with no subscription; stuck on auth page; redirect loop. |

---

### 4. Signed-in user with no subscription tries to access `/dashboard`

| | |
|---|---|
| **Starting state** | Signed in; not subscribed. |
| **Steps** | Navigate to `/dashboard`. |
| **Expected** | Redirect to **`/start`** (query cleared). |
| **Bug signals** | Dashboard loads; redirect to sign-in instead of `/start`. |

---

### 5. Signed-in user with no subscription goes to `/start`

| | |
|---|---|
| **Starting state** | Signed in; not subscribed. |
| **Steps** | Open `/start` (no `?success=true`). |
| **Expected** | **`StartMarketing`** (plan selection / marketing) — no redirect away from `/start`. |
| **Bug signals** | Immediate redirect to `/dashboard`; blank page; errors in console. |

---

### 6. Signed-in user with no subscription purchases a subscription

| | |
|---|---|
| **Starting state** | Signed in; not subscribed. |
| **Steps** | From `/start` or `/pricing`, start Stripe checkout → pay with test card → return on success URL (`/start?success=true`). |
| **Expected** | Post-checkout UI (`PostCheckoutActivation`); row appears in `subscriptions`; UI eventually treats status as active and **redirects to `/dashboard`** (client polling). |
| **Bug signals** | Stuck on “activating” forever; redirect before webhook writes row; wrong user linked in DB. |

---

### 7. After successful purchase, subscribed user accesses `/dashboard`

| | |
|---|---|
| **Starting state** | Subscribed (`active` or `trialing`). |
| **Steps** | Open `/dashboard`. |
| **Expected** | Dashboard loads (no redirect to `/start`). |
| **Bug signals** | Bounced to `/start` despite active row; middleware logs show `access: false` for correct `user_id`. |

---

### 8. Subscribed user goes to `/start`

| | |
|---|---|
| **Starting state** | Subscribed. |
| **Steps** | Open `/start` (any query, including `?success=true`). |
| **Expected** | Middleware redirects to **`/dashboard`** (query cleared). |
| **Bug signals** | Can use `/start` as main hub while subscribed; redirect to sign-in. |

---

### 9. Subscribed user opens Account and Billing pages

| | |
|---|---|
| **Starting state** | Subscribed; signed in. |
| **Steps** | Open `/account`, then `/billing`. |
| **Expected** | Both pages load. Account shows subscription summary when row exists. Billing hub shows links to subscription details and pricing. |
| **Bug signals** | Redirect to `/start` or `/sign-in` (would indicate unexpected gating or session loss). |

---

### 10. Subscribed user clicks “Manage plan”

| | |
|---|---|
| **Starting state** | Subscribed; on **Account** (`/account`). |
| **Steps** | Click **Manage plan** (Subscription section). |
| **Expected** | Navigates to **`/billing`** (not `/start`). From Billing, “Plans & checkout” → `/pricing`; “Subscription details” → `/account#subscription`. |
| **Bug signals** | Link still points to `/start` or `/start#pricing`; 404 on `/billing`. |

---

## Quick sanity checks

| Check | Expected |
|--------|----------|
| `hasActiveAppSubscription` | `true` only for `active` / `trialing`. |
| Gated routes | Non-subscribed → `/start`; subscribed → allowed. |
| Post-checkout URL | Stripe success → `/start?success=true` (then poll → `/dashboard` when active). |
