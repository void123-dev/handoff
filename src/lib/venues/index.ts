import type { Candle, FlowBar } from "@/handoff/types";
import type { VenueId } from "@/lib/query";
import { binanceVenue } from "./binance";
import { bybitVenue } from "./bybit";
import { okxVenue } from "./okx";
import type { VenueAdapter } from "./types";

const registry: Record<VenueId, VenueAdapter> = {
  binance: binanceVenue,
  bybit: bybitVenue,
  okx: okxVenue,
};

export function registerVenue(adapter: VenueAdapter) {
  registry[adapter.id] = adapter;
}

export function listVenues(): VenueAdapter[] {
  return Object.values(registry);
}

export async function fetchVenueCandles(
  venue: VenueId,
  symbol: string,
  start: number,
  end: number,
): Promise<Candle[]> {
  const adapter = registry[venue];
  if (!adapter) throw new Error(`unknown venue ${venue}`);
  const bars = await adapter.fetch1h(symbol, start, end);
  return [...bars].sort((a, b) => a.t - b.t);
}

export async function fetchVenueFlow(
  venue: VenueId,
  symbol: string,
  start: number,
  end: number,
): Promise<FlowBar[]> {
  const adapter = registry[venue];
  if (!adapter) throw new Error(`unknown venue ${venue}`);
  const bars = await adapter.fetch5m(symbol, start, end);
  return [...bars].sort((a, b) => a.t - b.t);
}

export { registry };
