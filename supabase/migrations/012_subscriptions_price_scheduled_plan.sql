-- Stripe-backed fields for accurate current tier and scheduled plan changes (e.g. portal switch at period end).

alter table public.subscriptions
  add column if not exists price_id text,
  add column if not exists scheduled_plan text;
