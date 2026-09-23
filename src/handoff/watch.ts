/** One INFO when a junction enters wait_next. Fingerprint blocks the rest of that session. */
import type { Phase } from "./phase.ts";

export function waitNextFingerprint(symbol: string, junction: string, sessionDate: string): string {
  return `wait_next:${symbol}:${junction}:${sessionDate}`;
}

export function shouldEmitWaitNext(prev: Phase | null, next: Phase, fingerprintSent: boolean): boolean {
  if (fingerprintSent) return false;
  if (next !== "wait_next") return false;
  return prev === "live" || prev === "awaiting" || prev === null;
}

export function waitNextTelegram(symbol: string, junctionLabel: string): string {
  return [
    `Слои · ${symbol}`,
    "INFO · wait_next",
    `Стык ${junctionLabel} выдохся · внутри диапазона · объём сел · CVD нейтральный`,
    "Не искать вход до следующей сессии. Фильтр, не ордер.",
  ].join("\n");
}
