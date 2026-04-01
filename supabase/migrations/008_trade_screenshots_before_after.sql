-- Add explicit before/after screenshot fields.
-- Backward-compatible: keep legacy `screenshot` on trades.

alter table public.open_trades
  add column if not exists opening_screenshot text;

alter table public.trades
  add column if not exists opening_screenshot text,
  add column if not exists closing_screenshot text;
