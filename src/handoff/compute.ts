/** HANDOFF-1.2 snapshot builder: prior session + memory bucket → lean, then session phase. */
import { activeJunction } from "./sessionClock.ts";
import { rowPressed, selectBucket } from "./memory.ts";
import { leanRule } from "./lean.ts";
import { applyOverlay } from "./overlay.ts";
import { makeHeadlines } from "./headlines.ts";
import { resolvePhase } from "./phase.ts";
import { buildArchivePairs, outcomeTick, toMemoryRow } from "./pairs.ts";
import type { LayerTape } from "./tape.ts";
import type {
  ArchiveRow,
  DataSource,
  FlowBar,
  HandoffSnapshot,
  JunctionTick,
  MemoryCard,
  PSource,
  SessionPrint,
} from "./types.ts";

export function lastCompletedPrior(
  printed: SessionPrint[],
  from: SessionPrint["name"],
  now: number,
): SessionPrint | null {
  for (let i = printed.length - 1; i >= 0; i--) {
    const s = printed[i]!;
    if (s.name === from && s.end <= now) return s;
  }
  for (let i = printed.length - 1; i >= 0; i--) {
    if (printed[i]!.name === from) return printed[i]!;
  }
  return printed.length ? printed[printed.length - 1]! : null;
}

export function computeHandoff(args: {
  printed: SessionPrint[];
  archive: ArchiveRow[];
  now: number;
  lookback: number;
  symbol: string;
  venue: string;
  source: DataSource;
  flow?: FlowBar[];
  layers?: LayerTape;
}): HandoffSnapshot {
  const clock = activeJunction(args.now);
  const prior = lastCompletedPrior(args.printed, clock.from, args.now);
  const ruleLean = prior ? leanRule(prior) : "unclear";
  const weekend = prior?.weekend ?? false;

  const seed = {
    junction: clock.junction,
    pressed: prior
      ? rowPressed({
          t: prior.end,
          junction: clock.junction,
          stuck: prior.stuck,
          pressedHigh: prior.pressedHigh,
          pressedLow: prior.pressedLow,
          stretch: prior.stretch,
          closeLoc: prior.closeLoc,
          sweep: prior.sweep,
          weekend: prior.weekend,
          continued: null,
          inside: false,
          brokeHigh: false,
          brokeLow: false,
        })
      : ("other" as const),
    stretch: prior?.stretch,
    closeLoc: prior?.closeLoc,
    sweep: prior?.sweep,
    weekend: prior?.weekend,
  };

  const pool = args.archive
    .filter(
      (r) =>
        r.symbol === args.symbol &&
        r.venue === args.venue &&
        r.junction === clock.junction,
    )
    .slice(-args.lookback);

  const bucket = selectBucket(pool.map(toMemoryRow), seed, 40);
  const stuck = prior?.stuck ?? false;
  const lean = applyOverlay(ruleLean, bucket.frequencies, stuck);

  let pSource: PSource = "bucket";
  if (args.source === "demo") pSource = "demo";
  else if (bucket.thin) pSource = "rule";

  const memory: MemoryCard = {
    key: bucket.key,
    thin: bucket.thin,
    n: bucket.frequencies.n,
    pInside: bucket.frequencies.pInside,
    pBrokeHigh: bucket.frequencies.pBrokeHigh,
    pBrokeLow: bucket.frequencies.pBrokeLow,
    pBoth: bucket.frequencies.pBoth,
    pContinue: bucket.frequencies.pContinue,
    pSource,
    warning: bucket.thin ? "thin_sample" : null,
  };

  const ticks: JunctionTick[] = pool.slice(-24).map((row) => ({
    t: row.t,
    mark: outcomeTick(row),
    inside: row.inside,
    brokeHigh: row.brokeHigh,
    brokeLow: row.brokeLow,
    continued: row.continued,
  }));

  const thinOrUnclear = lean === "unclear" || memory.thin || memory.n < 40;
  const phase = resolvePhase({
    now: args.now,
    lean,
    n: memory.n,
    pInside: memory.pInside,
    priorHigh: prior?.high ?? null,
    priorLow: prior?.low ?? null,
    bars: args.flow,
    layers: args.layers,
  });
  const headlines = makeHeadlines({
    lean,
    junction: clock.junction,
    stuck,
    memory,
  });
  const headline = phase.headline || headlines.headline;
  const headlineRu = phase.headlineRu || headlines.headlineRu;

  return {
    model: "HANDOFF-1.2",
    symbol: args.symbol,
    venue: args.venue,
    lookback: args.lookback,
    source: args.source,
    asOf: args.now,
    lean,
    sessionPhase: phase.sessionPhase,
    advice: phase.advice,
    neutralVotes: phase.neutralVotes,
    insidePrior: phase.insidePrior,
    volFade: phase.volFade,
    cvdFlat: phase.cvdFlat,
    pContinue: memory.pContinue,
    pInside: memory.pInside,
    pBrokeHigh: memory.pBrokeHigh,
    pBrokeLow: memory.pBrokeLow,
    n: memory.n,
    thin: memory.thin,
    prior,
    stretch: prior?.stretch ?? null,
    closeLoc: prior?.closeLoc ?? null,
    sweptPrior: prior?.sweep ?? null,
    weekend,
    deadZone: clock.awaiting || thinOrUnclear || (weekend && prior?.stretch !== "exhausted"),
    stuck,
    pressedHigh: prior?.pressedHigh ?? false,
    pressedLow: prior?.pressedLow ?? false,
    junction: clock.junction,
    from: clock.from,
    to: clock.to,
    awaiting: clock.awaiting,
    headline,
    headlineRu,
    memory,
    ticks,
  };
}

export function archiveFromPrinted(
  printed: SessionPrint[],
  symbol: string,
  venue: string,
): ArchiveRow[] {
  return buildArchivePairs(printed, symbol, venue, 800);
}
