import { env } from "@/lib/env.server";
import type { NeighborBrief } from "@/handoff/types";

async function pull(base: string | undefined, path: string): Promise<NeighborBrief | null> {
  if (!base) return null;
  const url = `${base.replace(/\/$/, "")}${path}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json", "User-Agent": "HANDOFF-1.1" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    const snap = (data.snapshot as Record<string, unknown> | undefined) ?? data;
    return {
      model: typeof snap.model === "string" ? snap.model : undefined,
      headline: typeof snap.headline === "string" ? snap.headline : undefined,
      state:
        typeof snap.lean === "string"
          ? snap.lean
          : typeof snap.state === "string"
            ? snap.state
            : undefined,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function loadNeighbors(symbol: string, venue: string) {
  const q = `?symbol=${encodeURIComponent(symbol)}&venue=${encodeURIComponent(venue)}`;
  const [gravity, anvil, coil] = await Promise.all([
    pull(env("GRAVITY_API_BASE"), `/api/desk${q}`),
    pull(env("ANVIL_API_BASE"), `/api/desk${q}`),
    pull(env("COIL_API_BASE"), `/api/desk${q}`),
  ]);
  if (!gravity && !anvil && !coil) return undefined;
  return { gravity, anvil, coil };
}
