import type { Candle } from "@/handoff/types";
import type { VenueAdapter } from "./types";
import { fetchJson, usdtSymbol } from "./http";

type Kline = [number, string, string, string, string, ...unknown[]];

const HOSTS = [
  "https://data-api.binance.vision",
  "https://api.binance.com",
  "https://api.binance.us",
];

async function fetchPage(host: string, pair: string, cursor: number, end: number): Promise<Kline[]> {
  const url = `${host}/api/v3/klines?symbol=${pair}&interval=1h&startTime=${cursor}&endTime=${end}&limit=1000`;
  const raw = (await fetchJson(url)) as Kline[];
  return Array.isArray(raw) ? raw : [];
}

function minBarsForWindow(start: number, end: number): number {
  const spanHours = Math.max(1, Math.ceil((end - start) / 3_600_000));
  return Math.min(48, spanHours);
}

async function fetch1h(symbol: string, start: number, end: number): Promise<Candle[]> {
  const pair = usdtSymbol(symbol);
  const minBars = minBarsForWindow(start, end);
  let lastErr: unknown;
  for (const host of HOSTS) {
    try {
      const out: Candle[] = [];
      let cursor = start;
      for (let page = 0; page < 4 && cursor < end; page++) {
        const raw = await fetchPage(host, pair, cursor, end);
        if (!raw.length) break;
        for (const row of raw) {
          out.push({
            t: Number(row[0]),
            o: Number(row[1]),
            h: Number(row[2]),
            l: Number(row[3]),
            c: Number(row[4]),
          });
        }
        const last = Number(raw[raw.length - 1]?.[0]);
        if (!Number.isFinite(last) || last <= cursor) break;
        cursor = last + 1;
        if (raw.length < 1000) break;
      }
      if (out.length >= minBars) return out;
    } catch (err) {
      lastErr = err;
    }
  }
  if (lastErr) throw lastErr;
  return [];
}

export const binanceVenue: VenueAdapter = {
  id: "binance",
  label: "Binance",
  volumeUsd: 900_000_000,
  fetch1h,
};
