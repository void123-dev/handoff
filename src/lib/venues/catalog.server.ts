import type { Candle } from "@/handoff/types";
/** Probe public pits in parallel. Default venue is the first live pit, not high-volume demo Binance. */
import { cacheGet, cacheKey, cacheSet } from "@/lib/cache";
import type { VenueId } from "@/lib/query";
import { fetchVenueCandles, listVenues } from "@/lib/venues";
import { defaultPit, sortPits, type Pit } from "@/lib/venues/rank";

const CATALOG_TTL_MS = 45_000;
const PROBE_MS = 72 * 60 * 60 * 1000;
const PROBE_TIMEOUT_MS = 2_500;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("probe-timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function probeLive(id: VenueId): Promise<boolean> {
  const now = Date.now();
  try {
    const bars = await withTimeout<Candle[]>(
      fetchVenueCandles(id, "BTC", now - PROBE_MS, now),
      PROBE_TIMEOUT_MS,
    );
    return bars.length >= 1;
  } catch {
    return false;
  }
}

export type VenueCatalog = {
  pits: Pit[];
  default: { venue: VenueId; lookback: 180 };
};

export async function getVenueCatalog(): Promise<VenueCatalog> {
  const key = cacheKey(["venues-catalog", "72h"]);
  const hit = cacheGet<VenueCatalog>(key);
  if (hit) return hit;

  const adapters = listVenues();
  const probed = await Promise.all(
    adapters.map(async (v) => {
      const live = await probeLive(v.id);
      const pit: Pit = {
        id: v.id,
        label: v.label,
        source: live ? "live" : "demo",
        volumeUsd: v.volumeUsd,
      };
      return pit;
    }),
  );
  const pits = sortPits(probed);
  const pick = defaultPit(pits);
  const catalog: VenueCatalog = {
    pits,
    default: { venue: pick.id as VenueId, lookback: 180 },
  };
  return cacheSet(key, catalog, CATALOG_TTL_MS);
}
