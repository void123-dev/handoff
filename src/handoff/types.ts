import type { Junction, SessionName } from "./sessionClock.ts";
import type { MemoryKey } from "./memory.ts";

export type Lean = "continue" | "break" | "unclear";
export type Stretch = "normal" | "extended" | "exhausted";
export type CloseLoc = "low" | "mid" | "high";
export type Sweep = "none" | "high" | "low" | "both";
export type DataSource = "demo" | "live";
export type PSource = "bucket" | "rule" | "demo";
export type TickMark = "C" | "B" | "I";

export type Candle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
};

export type RawSession = {
  name: SessionName;
  start: number;
  end: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type SessionPrint = RawSession & {
  ret: number;
  range: number;
  closeLoc: CloseLoc;
  closeLocRatio: number;
  stretch: Stretch;
  stretchRatio: number;
  flat: boolean;
  stuck: boolean;
  sweep: Sweep;
  atPriorHigh: boolean;
  atPriorLow: boolean;
  pressedHigh: boolean;
  pressedLow: boolean;
  weekend: boolean;
};

export type ArchiveRow = {
  t: number;
  junction: Junction;
  symbol: string;
  venue: string;
  priorName: SessionName;
  priorRet: number;
  priorRange: number;
  closeLoc: CloseLoc;
  stretch: Stretch;
  sweep: Sweep;
  stuck: boolean;
  pressedHigh: boolean;
  pressedLow: boolean;
  weekend: boolean;
  nextRet: number;
  nextRange: number;
  brokeHigh: boolean;
  brokeLow: boolean;
  inside: boolean;
  continued: boolean | null;
};

export type MemoryCard = {
  key: MemoryKey;
  thin: boolean;
  n: number;
  pInside: number | null;
  pBrokeHigh: number | null;
  pBrokeLow: number | null;
  pBoth: number | null;
  pContinue: number | null;
  pSource: PSource;
  warning: "thin_sample" | null;
};

export type JunctionTick = {
  t: number;
  mark: TickMark;
  inside: boolean;
  brokeHigh: boolean;
  brokeLow: boolean;
  continued: boolean | null;
};

export type NeighborBrief = {
  model?: string;
  headline?: string;
  state?: string;
};

export type HandoffSnapshot = {
  model: "HANDOFF-1.1";
  symbol: string;
  venue: string;
  lookback: number;
  source: DataSource;
  asOf: number;
  lean: Lean;
  pContinue: number | null;
  pInside: number | null;
  pBrokeHigh: number | null;
  pBrokeLow: number | null;
  n: number;
  thin: boolean;
  prior: SessionPrint | null;
  stretch: Stretch | null;
  closeLoc: CloseLoc | null;
  sweptPrior: Sweep | null;
  weekend: boolean;
  deadZone: boolean;
  stuck: boolean;
  pressedHigh: boolean;
  pressedLow: boolean;
  junction: Junction;
  from: SessionName;
  to: SessionName;
  awaiting: boolean;
  headline: string;
  headlineRu: string;
  memory: MemoryCard;
  ticks: JunctionTick[];
  neighbors?: {
    gravity?: NeighborBrief | null;
    anvil?: NeighborBrief | null;
    coil?: NeighborBrief | null;
  };
};
