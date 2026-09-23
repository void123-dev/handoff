/** Sibling desks are display-only for lean. Live reads may vote on wait_next; demo and offline do not. */
import { env } from "@/lib/env.server";
import type { NeighborBrief } from "@/handoff/types";
import type { LayerSnap, LayerTape } from "@/handoff/tape";

export type NeighborBundle = {
  display?: {
    gravity?: NeighborBrief | null;
    anvil?: NeighborBrief | null;
    coil?: NeighborBrief | null;
  };
  tape: LayerTape;
};

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readSnap(data: Record<string, unknown>): { brief: NeighborBrief; layer: LayerSnap } {
  const snap = (data.snapshot as Record<string, unknown> | undefined) ?? data;
  const nested =
    (snap.anvil as Record<string, unknown> | undefined) ??
    (snap.gravity as Record<string, unknown> | undefined) ??
    (snap.coil as Record<string, unknown> | undefined);
  const src = snap.source ?? snap.dataSource ?? data.source;
  const squeeze = snap.squeeze;
  const armed =
    snap.armed === true ||
    snap.squeezeArmed === true ||
    (typeof squeeze === "object" && squeeze !== null && (squeeze as { armed?: boolean }).armed === true);
  const state =
    typeof snap.state === "string"
      ? snap.state
      : typeof snap.lean === "string"
        ? snap.lean
        : typeof nested?.state === "string"
          ? nested.state
          : undefined;
  const coupling =
    typeof snap.coupling === "string"
      ? snap.coupling
      : typeof nested?.coupling === "string"
        ? nested.coupling
        : undefined;
  const layer: LayerSnap = {
    source: src === "demo" || snap.demo === true ? "demo" : "live",
    state,
    coupling,
    a: num(snap.a) ?? num(nested?.a),
    g: num(snap.g) ?? num(nested?.g),
    armed,
  };
  return {
    brief: {
      model: typeof snap.model === "string" ? snap.model : undefined,
      headline: typeof snap.headline === "string" ? snap.headline : undefined,
      state,
    },
    layer,
  };
}

async function pull(base: string | undefined, path: string): Promise<{ brief: NeighborBrief; layer: LayerSnap } | null> {
  if (!base) return null;
  const url = `${base.replace(/\/$/, "")}${path}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json", "User-Agent": "HANDOFF-1.2" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    return readSnap(data);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function loadNeighbors(symbol: string, venue: string): Promise<NeighborBundle> {
  const q = `?symbol=${encodeURIComponent(symbol)}&venue=${encodeURIComponent(venue)}`;
  const [gravity, anvil, coil] = await Promise.all([
    pull(env("GRAVITY_API_BASE"), `/api/desk${q}`),
    pull(env("ANVIL_API_BASE"), `/api/desk${q}`),
    pull(env("COIL_API_BASE"), `/api/desk${q}`),
  ]);
  const display =
    gravity || anvil || coil
      ? {
          gravity: gravity?.brief ?? null,
          anvil: anvil?.brief ?? null,
          coil: coil?.brief ?? null,
        }
      : undefined;
  return {
    display,
    tape: {
      gravity: gravity?.layer ?? null,
      anvil: anvil?.layer ?? null,
      coil: coil?.layer ?? null,
    },
  };
}
