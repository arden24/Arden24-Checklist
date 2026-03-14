/**
 * Central storage key helpers. When userId is provided (logged-in user),
 * keys are scoped per user so each account has its own data.
 * When userId is undefined (anonymous), legacy keys are used for backward compatibility.
 */

const STRATEGIES_BASE = "tradechecklist_strategies";
const TRADES_BASE = "tradechecklist_trades";
const OPEN_TRADES_BASE = "tradechecklist_open_trades";
const BEST_STRATEGY_IMAGE_BASE = "tradechecklist_best_strategy_image";

export function getStrategiesKey(userId?: string | null): string {
  return userId ? `${STRATEGIES_BASE}_${userId}` : STRATEGIES_BASE;
}

export function getTradesKey(userId?: string | null): string {
  return userId ? `${TRADES_BASE}_${userId}` : TRADES_BASE;
}

export function getOpenTradesKey(userId?: string | null): string {
  return userId ? `${OPEN_TRADES_BASE}_${userId}` : OPEN_TRADES_BASE;
}

export function getBestStrategyImageKey(userId?: string | null): string {
  return userId ? `${BEST_STRATEGY_IMAGE_BASE}_${userId}` : BEST_STRATEGY_IMAGE_BASE;
}
