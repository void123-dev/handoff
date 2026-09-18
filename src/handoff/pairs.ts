import { junctionOf } from "./sessionClock.ts";
import { sign } from "./math.ts";
import type { ArchiveRow, SessionPrint, TickMark } from "./types.ts";
import type { MemoryRow } from "./memory.ts";

export function continuedOf(
  prior: SessionPrint,
  next: SessionPrint,
): boolean | null {
  if (prior.flat || next.flat) return null;
  if (sign(prior.ret) === 0 || sign(next.ret) === 0) return null;
  return sign(next.ret) === sign(prior.ret);
}

export function toMemoryRow(row: ArchiveRow): MemoryRow {
  return {
    t: row.t,
    junction: row.junction,
    stuck: row.stuck,
    pressedHigh: row.pressedHigh,
    pressedLow: row.pressedLow,
    stretch: row.stretch,
    closeLoc: row.closeLoc,
    sweep: row.sweep,
    weekend: row.weekend,
    continued: row.continued,
    inside: row.inside,
    brokeHigh: row.brokeHigh,
    brokeLow: row.brokeLow,
  };
}

export function buildArchivePairs(
  printed: SessionPrint[],
  symbol: string,
  venue: string,
  cap = 800,
): ArchiveRow[] {
  const rows: ArchiveRow[] = [];
  for (let i = 0; i < printed.length - 1; i++) {
    const prior = printed[i]!;
    const next = printed[i + 1]!;
    const junction = junctionOf(prior.name, next.name);
    if (!junction) continue;
    const brokeHigh = next.high > prior.high;
    const brokeLow = next.low < prior.low;
    rows.push({
      t: prior.end,
      junction,
      symbol,
      venue,
      priorName: prior.name,
      priorRet: prior.ret,
      priorRange: prior.range,
      closeLoc: prior.closeLoc,
      stretch: prior.stretch,
      sweep: prior.sweep,
      stuck: prior.stuck,
      pressedHigh: prior.pressedHigh,
      pressedLow: prior.pressedLow,
      weekend: prior.weekend,
      nextRet: next.ret,
      nextRange: next.range,
      brokeHigh,
      brokeLow,
      inside: !brokeHigh && !brokeLow,
      continued: continuedOf(prior, next),
    });
  }
  return rows.length > cap ? rows.slice(-cap) : rows;
}

export function outcomeTick(row: Pick<MemoryRow, "inside" | "continued" | "brokeHigh" | "brokeLow">): TickMark {
  if (row.inside) return "I";
  if (row.continued === true) return "C";
  return "B";
}
