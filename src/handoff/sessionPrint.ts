import { etParts, sessionNameAt, type SessionName } from "./sessionClock.ts";
import { median } from "./math.ts";
import type { Candle, CloseLoc, RawSession, SessionPrint, Stretch, Sweep } from "./types.ts";

const GAP_MS = 3.5 * 60 * 60 * 1000;

export function closeLocOf(open: number, high: number, low: number, close: number): {
  closeLoc: CloseLoc;
  ratio: number;
  range: number;
} {
  const range = high - low;
  const ratio = range <= 0 ? 0.5 : (close - low) / range;
  const closeLoc: CloseLoc = ratio < 0.2 ? "low" : ratio > 0.8 ? "high" : "mid";
  return { closeLoc, ratio, range };
}

export function stretchOf(absRet: number, medianAbs: number): { stretch: Stretch; ratio: number } {
  const ratio = medianAbs > 0 ? absRet / medianAbs : 0;
  const stretch: Stretch = ratio > 2 ? "exhausted" : ratio >= 1.3 ? "extended" : "normal";
  return { stretch, ratio };
}

export function sweepVs(prior: RawSession, previous: RawSession | undefined): Sweep {
  if (!previous) return "none";
  const high = prior.high > previous.high;
  const low = prior.low < previous.low;
  if (high && low) return "both";
  if (high) return "high";
  if (low) return "low";
  return "none";
}

export function pressedFromPrior6(
  session: RawSession,
  priorSix: RawSession[],
  closeLoc: CloseLoc,
  stuck: boolean,
): { atPriorHigh: boolean; atPriorLow: boolean; pressedHigh: boolean; pressedLow: boolean } {
  if (!priorSix.length) {
    return { atPriorHigh: false, atPriorLow: false, pressedHigh: false, pressedLow: false };
  }
  const maxHigh = Math.max(...priorSix.map((s) => s.high));
  const minLow = Math.min(...priorSix.map((s) => s.low));
  const atPriorHigh = session.high >= maxHigh * 0.999;
  const atPriorLow = session.low <= minLow * 1.001;
  return {
    atPriorHigh,
    atPriorLow,
    pressedHigh: atPriorHigh && (closeLoc === "high" || stuck),
    pressedLow: atPriorLow && (closeLoc === "low" || stuck),
  };
}

export function expectedSessionEnd(name: SessionName, start: number): number {
  let t = start + 60 * 60 * 1000;
  for (let i = 0; i < 16; i++) {
    if (sessionNameAt(t) !== name) return t;
    t += 60 * 60 * 1000;
  }
  return t;
}

export function buildRawSessions(candles: Candle[], now: number): RawSession[] {
  const ordered = [...candles].sort((a, b) => a.t - b.t);
  const out: RawSession[] = [];
  let cur: {
    name: SessionName;
    start: number;
    open: number;
    high: number;
    low: number;
    close: number;
    lastT: number;
  } | null = null;

  const flush = (end: number) => {
    if (!cur) return;
    out.push({
      name: cur.name,
      start: cur.start,
      end,
      open: cur.open,
      high: cur.high,
      low: cur.low,
      close: cur.close,
    });
    cur = null;
  };

  for (const bar of ordered) {
    const name = sessionNameAt(bar.t);
    if (!name) {
      if (cur) flush(expectedSessionEnd(cur.name, cur.start));
      continue;
    }
    if (cur && (cur.name !== name || bar.t - cur.lastT > GAP_MS)) {
      flush(expectedSessionEnd(cur.name, cur.start));
    }
    if (!cur) {
      cur = {
        name,
        start: bar.t,
        open: bar.o,
        high: bar.h,
        low: bar.l,
        close: bar.c,
        lastT: bar.t,
      };
    } else {
      cur.high = Math.max(cur.high, bar.h);
      cur.low = Math.min(cur.low, bar.l);
      cur.close = bar.c;
      cur.lastT = bar.t;
    }
  }
  if (cur) {
    const end = expectedSessionEnd(cur.name, cur.start);
    if (end <= now) flush(end);
  }
  return out;
}

export function printSessions(raw: RawSession[], lookback: number): SessionPrint[] {
  const lb = Math.max(1, lookback);
  return raw.map((s, i) => {
    const ret = s.open !== 0 ? s.close / s.open - 1 : 0;
    const { closeLoc, ratio, range } = closeLocOf(s.open, s.high, s.low, s.close);
    const window = raw.slice(Math.max(0, i - lb), i);
    const medianAbs = median(window.map((w) => Math.abs(w.open !== 0 ? w.close / w.open - 1 : 0)));
    const medianRange = median(window.map((w) => w.high - w.low));
    const absRet = Math.abs(ret);
    const flat = medianAbs > 0 ? absRet < 0.15 * medianAbs : absRet === 0;
    const { stretch, ratio: stretchRatio } = stretchOf(absRet, medianAbs);
    const stuck = flat || (medianRange > 0 && range < 0.85 * medianRange && closeLoc === "mid");
    const priorSix = raw.slice(Math.max(0, i - 6), i);
    const pressed = pressedFromPrior6(s, priorSix, closeLoc, stuck);
    const sweep = sweepVs(s, raw[i - 1]);
    const weekend = etParts(s.start).weekend;
    return {
      ...s,
      ret,
      range,
      closeLoc,
      closeLocRatio: ratio,
      stretch,
      stretchRatio,
      flat,
      stuck,
      sweep,
      weekend,
      ...pressed,
    };
  });
}
