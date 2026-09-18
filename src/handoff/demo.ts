import { hashString, mulberry32 } from "./math.ts";
import type { Candle } from "./types.ts";

const SYMBOL_PX: Record<string, number> = {
  BTC: 64000,
  ETH: 3200,
  SOL: 148,
  XRP: 0.62,
  DOGE: 0.14,
  BNB: 580,
};

export function demoCandles(symbol: string, venue: string, now: number, days = 220): Candle[] {
  const seed = hashString(`${symbol}:${venue}:handoff-1.1`);
  const rand = mulberry32(seed);
  const hour = 60 * 60 * 1000;
  const end = Math.floor(now / hour) * hour;
  const start = end - days * 24 * hour;
  let px = SYMBOL_PX[symbol] ?? 100;
  px *= 0.85 + (seed % 1000) / 4000;
  const out: Candle[] = [];
  for (let t = start; t < end; t += hour) {
    const hourOf = Math.floor(t / hour) % 24;
    const stretchBump = rand() > 0.97 ? 2.4 + rand() * 2 : rand() > 0.9 ? 1.4 : 1;
    const sessionAmp = hourOf >= 8 && hourOf < 16 ? 1.15 : hourOf >= 3 && hourOf < 8 ? 1.05 : 0.9;
    const ret = (rand() - 0.49) * 0.0042 * stretchBump * sessionAmp;
    const o = px;
    const c = Math.max(px * (1 + ret), px * 0.0001);
    const wick = Math.abs(ret) * (0.3 + rand() * 0.8) + px * 0.0004 * rand();
    const h = Math.max(o, c) + wick;
    const l = Math.max(Math.min(o, c) - wick, px * 0.0001);
    out.push({ t, o, h, l, c });
    px = c;
  }
  return out;
}
