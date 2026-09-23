/** Session phase beside lean. wait_next is a filter, not a new indicator. */
import {
  activeJunction,
  sessionEndMs,
  sessionLabel,
  sessionOpenMs,
  waitNextEligible,
} from "./sessionClock.ts";
import { scoreTape, type LayerTape } from "./tape.ts";
import type { FlowBar, Lean, SessionAdvice, SessionPhase } from "./types.ts";

export type Phase = SessionPhase;
export type Advice = SessionAdvice;

export function sessionPhase(s: {
  awaiting: boolean;
  eligible: boolean;
  sessionEnded: boolean;
  brokePriorRange: boolean;
  neutralVotes: number;
  fight: boolean;
  coilArmed: boolean;
}): Phase {
  if (s.sessionEnded || s.brokePriorRange) return "resolved";
  if (s.awaiting) return "awaiting";
  if (!s.eligible) return "live";
  if (s.fight || s.coilArmed) return "live";
  if (s.neutralVotes >= 3) return "wait_next";
  return "live";
}

export function advice(phase: Phase, lean: Lean): Advice {
  if (phase === "awaiting") return "wait_junction";
  if (phase === "wait_next") return "wait_next_session";
  if (lean === "unclear") return "wait_junction";
  return "read_layers";
}

export function layersHint(next: Advice): "junction_wait" | "go_look" {
  return next === "wait_next_session" ? "junction_wait" : "go_look";
}

export type PhaseRead = {
  sessionPhase: Phase;
  advice: Advice;
  neutralVotes: number;
  insidePrior: boolean;
  volFade: boolean;
  cvdFlat: boolean;
  fight: boolean;
  coilArmed: boolean;
  eligible: boolean;
  sessionEnded: boolean;
  headline: string;
  headlineRu: string;
};

function waitNextCopy(
  to: "asia" | "london" | "ny",
  from: "asia" | "london" | "ny",
  flags: { insidePrior: boolean; volFade: boolean; cvdFlat: boolean },
) {
  const bits = ["Wait next", `${sessionLabel(to)} stale`];
  if (flags.insidePrior) bits.push(`inside ${sessionLabel(from)}`);
  if (flags.volFade) bits.push("vol faded");
  if (flags.cvdFlat) bits.push("CVD flat");
  return {
    headline: bits.join(" · "),
    headlineRu: `Ждать следующую · ${sessionLabel(to)} без импульса после стыка`,
  };
}

export function resolvePhase(args: {
  now: number;
  lean: Lean;
  n: number;
  pInside: number | null;
  priorHigh: number | null;
  priorLow: number | null;
  bars?: FlowBar[];
  layers?: LayerTape;
}): PhaseRead {
  const clock = activeJunction(args.now);
  const open = sessionOpenMs(args.now, clock.to);
  const end = sessionEndMs(open, clock.to);
  const eligible = waitNextEligible(args.now, clock.junction);
  const sessionEnded = args.now >= end;
  const tape = scoreTape({
    bars: args.bars ?? [],
    sessionStart: open,
    now: args.now,
    priorHigh: args.priorHigh,
    priorLow: args.priorLow,
    layers: args.layers,
  });
  const hard =
    (args.lean === "unclear" || ((args.pInside ?? 0) >= 0.45 && args.n >= 40)) && tape.quiet5m;
  const phase = sessionPhase({
    awaiting: clock.awaiting,
    eligible,
    sessionEnded,
    brokePriorRange: tape.brokePriorRange,
    neutralVotes: hard ? tape.neutralVotes : 0,
    fight: tape.fight,
    coilArmed: tape.coilArmed,
  });
  const next = advice(phase, args.lean);
  const copy = phase === "wait_next" ? waitNextCopy(clock.to, clock.from, tape) : null;
  return {
    sessionPhase: phase,
    advice: next,
    neutralVotes: tape.neutralVotes,
    insidePrior: tape.insidePrior,
    volFade: tape.volFade,
    cvdFlat: tape.cvdFlat,
    fight: tape.fight,
    coilArmed: tape.coilArmed,
    eligible,
    sessionEnded,
    headline: copy?.headline ?? "",
    headlineRu: copy?.headlineRu ?? "",
  };
}
