import type { Candle, FlowBar } from "@/handoff/types";
import type { VenueAdapter } from "./types";
import { fetchJson, usdtSymbol } from "./http";

async function fetch1h(symbol: string, start: number, end: number): Promise<Candle[]> {
  const out: Candle[] = [];
  let after: number | undefined;
  const instId = usdtSymbol(symbol, true);
  for (let page = 0; page < 12; page++) {
    const q = new URLSearchParams({ instId, bar: "1H", limit: "300" });
    if (after) q.set("after", String(after));
    const url = `https://www.okx.com/api/v5/market/history-candles?${q}`;
    const raw = (await fetchJson(url)) as { data?: string[][] };
    const list = raw.data ?? [];
    if (!list.length) break;
    const chunk: Candle[] = list.map((row) => ({
      t: Number(row[0]),
      o: Number(row[1]),
      h: Number(row[2]),
      l: Number(row[3]),
      c: Number(row[4]),
    }));
    out.push(...chunk);
    const oldest = chunk.reduce((m, c) => Math.min(m, c.t), Number.POSITIVE_INFINITY);
    if (!Number.isFinite(oldest) || oldest <= start) break;
    after = oldest;
    if (list.length < 300) break;
  }
  return out.filter((c) => c.t >= start && c.t <= end).sort((a, b) => a.t - b.t);
}

async function fetch5m(symbol: string, start: number, end: number): Promise<FlowBar[]> {
  const out: FlowBar[] = [];
  let after: number | undefined;
  const instId = usdtSymbol(symbol, true);
  for (let page = 0; page < 8; page++) {
    const q = new URLSearchParams({ instId, bar: "5m", limit: "300" });
    if (after) q.set("after", String(after));
    const url = `https://www.okx.com/api/v5/market/history-candles?${q}`;
    const raw = (await fetchJson(url)) as { data?: string[][] };
    const list = raw.data ?? [];
    if (!list.length) break;
    for (const row of list) {
      const close = Number(row[4]);
      const base = Number(row[5]);
      const quote = Number(row[7]);
      out.push({
        t: Number(row[0]),
        o: Number(row[1]),
        h: Number(row[2]),
        l: Number(row[3]),
        c: close,
        notional: Number.isFinite(quote) && quote > 0 ? quote : base * close,
      });
    }
    const oldest = list.reduce((m, row) => Math.min(m, Number(row[0])), Number.POSITIVE_INFINITY);
    if (!Number.isFinite(oldest) || oldest <= start) break;
    after = oldest;
    if (list.length < 300) break;
  }
  return out.filter((c) => c.t >= start && c.t <= end).sort((a, b) => a.t - b.t);
}

export const okxVenue: VenueAdapter = {
  id: "okx",
  label: "OKX",
  volumeUsd: 120_000_000,
  fetch1h,
  fetch5m,
};
