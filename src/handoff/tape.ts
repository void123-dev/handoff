/** Neutral-tape votes from 5m bars. Neighbors count only when source is live. */
import { etParts } from "./sessionClock.ts";
import type { FlowBar } from "./types.ts";

export type LayerSnap = {
  source: "live" | "demo";
  state?: string;
  coupling?: string;
  a?: number;
  g?: number;
  armed?: boolean;
};

export type LayerTape = {
  anvil?: LayerSnap | null;
  gravity?: LayerSnap | null;
  coil?: LayerSnap | null;
};

export type TapeScore = {
  insidePrior: boolean;
  volFade: boolean;
  cvdFlat: boolean;
  anvilQuiet: boolean | null;
  gravityQuiet: boolean | null;
  fight: boolean;
  coilArmed: boolean;
  quiet5m: boolean;
  brokePriorRange: boolean;
  neutralVotes: number;
};

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function anvilVote(layer: LayerSnap | null | undefined): boolean | null {
  if (!layer || layer.source !== "live") return null;
  const state = (layer.state ?? "").toUpperCase();
  if ((state === "UNCLEAR" || state === "ABSORB") && typeof layer.a === "number" && Math.abs(layer.a) < 0.15) {
    return true;
  }
  return false;
}

function gravityVote(layer: LayerSnap | null | undefined): { vote: boolean | null; fight: boolean } {
  if (!layer || layer.source !== "live") return { vote: null, fight: false };
  const coupling = (layer.coupling ?? layer.state ?? "").toLowerCase();
  if (coupling === "fight") return { vote: false, fight: true };
  if (coupling === "quiet") return { vote: true, fight: false };
  const mag = typeof layer.g === "number" ? Math.abs(layer.g) : null;
  if ((coupling === "sync_up" || coupling === "sync_down") && mag != null && mag < 0.12) {
    return { vote: true, fight: false };
  }
  return { vote: false, fight: false };
}

export function scoreTape(args: {
  bars: FlowBar[];
  sessionStart: number;
  now: number;
  priorHigh: number | null;
  priorLow: number | null;
  layers?: LayerTape;
}): TapeScore {
  const session = args.bars
    .filter((b) => b.t >= args.sessionStart && b.t <= args.now)
    .sort((a, b) => a.t - b.t);
  const last6 = session.slice(-6);
  const last4 = session.slice(-4);
  const hi = session.reduce((m, b) => Math.max(m, b.h), Number.NEGATIVE_INFINITY);
  const lo = session.reduce((m, b) => Math.min(m, b.l), Number.POSITIVE_INFINITY);
  const close = session.length ? session[session.length - 1]!.c : null;

  let insidePrior = false;
  let brokePriorRange = false;
  if (
    session.length &&
    close != null &&
    args.priorHigh != null &&
    args.priorLow != null &&
    Number.isFinite(hi) &&
    Number.isFinite(lo)
  ) {
    const pokedHigh = hi > args.priorHigh;
    const pokedLow = lo < args.priorLow;
    const closeInside = close <= args.priorHigh && close >= args.priorLow;
    insidePrior = (!pokedHigh && !pokedLow) || ((pokedHigh || pokedLow) && closeInside);
    brokePriorRange = (pokedHigh && close > args.priorHigh) || (pokedLow && close < args.priorLow);
  }

  let volFade = false;
  if (session.length >= 12 && last6.length === 6) {
    const recent = median(last6.map((b) => b.notional));
    const base = median(session.map((b) => b.notional));
    if (base > 0 && recent <= 0.6 * base) volFade = true;
  }
  if (!volFade && last6.length === 6) {
    const hour = etParts(args.now).hour;
    const from = args.now - 20 * 24 * 60 * 60 * 1000;
    const hist = args.bars.filter(
      (b) => b.t >= from && b.t < args.sessionStart && etParts(b.t).hour === hour,
    );
    if (hist.length >= 12) {
      const recent = median(last6.map((b) => b.notional));
      const base = median(hist.map((b) => b.notional));
      if (base > 0 && recent <= 0.55 * base) volFade = true;
    }
  }

  let cvdFlat = false;
  if (last6.length === 6) {
    const deltas = last6.map((b) => b.delta);
    const hasDelta = deltas.every((d) => typeof d === "number" && Number.isFinite(d));
    if (hasDelta) {
      const sum = deltas.reduce<number>((s, d) => s + (d ?? 0), 0);
      const abs = deltas.reduce<number>((s, d) => s + Math.abs(d ?? 0), 0);
      cvdFlat = abs === 0 ? true : Math.abs(sum) / abs <= 0.18;
    } else {
      const net = Math.abs(last6[5]!.c - last6[0]!.o);
      const ranges = last6.reduce((s, b) => s + Math.max(0, b.h - b.l), 0);
      cvdFlat = ranges === 0 ? true : net / ranges <= 0.22;
    }
  }

  const quiet5m =
    last4.length === 4 &&
    last4.every((b) => b.o !== 0 && Math.abs(b.c / b.o - 1) < 0.0025);

  const anvilQuiet = anvilVote(args.layers?.anvil);
  const gravity = gravityVote(args.layers?.gravity);
  const coilArmed = Boolean(args.layers?.coil && args.layers.coil.source === "live" && args.layers.coil.armed);

  const votes = [insidePrior, volFade, cvdFlat];
  if (anvilQuiet !== null) votes.push(anvilQuiet);
  if (gravity.vote !== null) votes.push(gravity.vote);

  return {
    insidePrior,
    volFade,
    cvdFlat,
    anvilQuiet,
    gravityQuiet: gravity.vote,
    fight: gravity.fight,
    coilArmed,
    quiet5m,
    brokePriorRange,
    neutralVotes: votes.filter(Boolean).length,
  };
}
