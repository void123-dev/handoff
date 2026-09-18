/** Load live 1h bars (or a deterministic demo feed), print sessions, and cache the HANDOFF card. */
import { archiveFromPrinted, computeHandoff } from "@/handoff/compute";
import { demoCandles } from "@/handoff/demo";
import { frequencies, match, selectBucket, type MemoryRow } from "@/handoff/memory";
import { toMemoryRow } from "@/handoff/pairs";
import { buildRawSessions, printSessions } from "@/handoff/sessionPrint";
import type { ArchiveRow, Candle, DataSource, HandoffSnapshot } from "@/handoff/types";
import { putArchive } from "@/lib/archive.server";
import { cacheGet, cacheKey, cacheSet } from "@/lib/cache";
import { loadNeighbors } from "@/lib/neighbors.server";
import type { HandoffQuery } from "@/lib/query";
import { fetchVenueCandles } from "@/lib/venues";

export type HandoffBundle = {
  snapshot: HandoffSnapshot;
  rows: ArchiveRow[];
  bucketRows: MemoryRow[];
};

function lookbackStart(lookback: number, now: number): number {
  const hours = Math.ceil(lookback * 9) + 48;
  return now - hours * 60 * 60 * 1000;
}

async function loadCandles(
  symbol: string,
  venue: HandoffQuery["venue"],
  now: number,
  lookback: number,
): Promise<{ candles: Candle[]; source: DataSource }> {
  const start = lookbackStart(lookback, now);
  try {
    const candles = await fetchVenueCandles(venue, symbol, start, now);
    if (candles.length >= 48) return { candles, source: "live" };
  } catch {
    // public pit failed — deterministic demo
  }
  return { candles: demoCandles(symbol, venue, now), source: "demo" };
}

export async function getHandoffBundle(query: HandoffQuery, now = Date.now()): Promise<HandoffBundle> {
  const key = cacheKey(["handoff", query.symbol, query.venue, query.lookback]);
  const hit = cacheGet<HandoffBundle>(key);
  if (hit) return hit;

  const { candles, source } = await loadCandles(query.symbol, query.venue, now, query.lookback);
  const raw = buildRawSessions(candles, now);
  const printed = printSessions(raw, query.lookback);
  const rows = archiveFromPrinted(printed, query.symbol, query.venue);
  await putArchive({
    symbol: query.symbol,
    venue: query.venue,
    sessions: raw,
    rows,
    source,
  });

  const snapshot = computeHandoff({
    printed,
    archive: rows,
    now,
    lookback: query.lookback,
    symbol: query.symbol,
    venue: query.venue,
    source,
  });

  try {
    const neighbors = await loadNeighbors(query.symbol, query.venue);
    if (neighbors) snapshot.neighbors = neighbors;
  } catch {
    // optional display only
  }

  const pool = rows
    .filter((r) => r.junction === snapshot.junction)
    .slice(-query.lookback)
    .map(toMemoryRow);
  const bucket = selectBucket(pool, snapshot.memory.key, 40);
  const bundle: HandoffBundle = {
    snapshot,
    rows,
    bucketRows: bucket.rows,
  };
  return cacheSet(key, bundle);
}

export function memoryPayload(bundle: HandoffBundle) {
  const { snapshot, bucketRows } = bundle;
  const matched = bucketRows.filter((r) => match(r, snapshot.memory.key));
  const rows = matched.length ? matched : bucketRows;
  return {
    model: "HANDOFF-1.1",
    symbol: snapshot.symbol,
    venue: snapshot.venue,
    lookback: snapshot.lookback,
    source: snapshot.source,
    junction: snapshot.junction,
    key: snapshot.memory.key,
    thin: snapshot.memory.thin,
    warning: snapshot.memory.warning,
    frequencies: frequencies(rows),
    rows: rows.slice(-120),
  };
}

function num(x: number | null | undefined): number {
  return typeof x === "number" && Number.isFinite(x) ? x : 0;
}

export function deskCard(snapshot: HandoffSnapshot) {
  return {
    model: snapshot.model,
    symbol: snapshot.symbol,
    venue: snapshot.venue,
    lookback: snapshot.lookback,
    source: snapshot.source,
    asOf: snapshot.asOf,
    lean: snapshot.lean,
    awaiting: snapshot.awaiting,
    junction: snapshot.junction,
    from: snapshot.from,
    to: snapshot.to,
    headline: snapshot.headline,
    headlineRu: snapshot.headlineRu,
    pContinue: num(snapshot.pContinue),
    pInside: num(snapshot.pInside),
    pBrokeHigh: num(snapshot.pBrokeHigh),
    pBrokeLow: num(snapshot.pBrokeLow),
    n: snapshot.n,
    thin: snapshot.thin,
    stuck: snapshot.stuck,
    pressedHigh: snapshot.pressedHigh,
    pressedLow: snapshot.pressedLow,
    stretch: snapshot.stretch,
    closeLoc: snapshot.closeLoc,
    sweptPrior: snapshot.sweptPrior,
    weekend: snapshot.weekend,
    deadZone: snapshot.deadZone,
    memory: snapshot.memory,
  };
}
