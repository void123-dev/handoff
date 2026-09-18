import type { Candle } from "@/handoff/types";
import type { VenueAdapter } from "./types";
import { fetchJson, usdtSymbol } from "./http";

async function fetch1h(symbol: string, start: number, end: number): Promise<Candle[]> {
  const out: Candle[] = [];
  let cursor = start;
  const pair = usdtSymbol(symbol);
  for (let page = 0; page < 4 && cursor < end; page++) {
    const url = `https://api.bybit.com/v5/market/kline?category=spot&symbol=${pair}&interval=60&start=${cursor}&end=${end}&limit=1000`;
    const raw = (await fetchJson(url)) as {
      result?: { list?: string[][] };
    };
    const list = raw.result?.list ?? [];
    if (!list.length) break;
    const chunk: Candle[] = list
      .map((row) => ({
        t: Number(row[0]),
        o: Number(row[1]),
        h: Number(row[2]),
        l: Number(row[3]),
        c: Number(row[4]),
      }))
      .filter((c) => Number.isFinite(c.t));
    chunk.sort((a, b) => a.t - b.t);
    out.push(...chunk);
    const last = chunk[chunk.length - 1]?.t;
    if (last == null || last <= cursor) break;
    cursor = last + 1;
    if (list.length < 1000) break;
  }
  return out;
}

export const bybitVenue: VenueAdapter = {
  id: "bybit",
  label: "Bybit",
  volumeUsd: 80_000_000,
  fetch1h,
};
