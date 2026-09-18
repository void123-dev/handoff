/** Rule lean from prior-session geometry only. Memory may later veto this to unclear. */
import type { Lean, SessionPrint } from "./types.ts";

export function closeAtExtremeOfMove(prior: Pick<SessionPrint, "ret" | "closeLoc">): boolean {
  if (prior.ret > 0) return prior.closeLoc === "high";
  if (prior.ret < 0) return prior.closeLoc === "low";
  return false;
}

export function leanRule(prior: SessionPrint): Lean {
  if (prior.flat) return "unclear";
  if (prior.weekend && prior.stretch !== "exhausted") return "unclear";
  if (!closeAtExtremeOfMove(prior)) return "unclear";
  if (prior.stretch === "exhausted" || prior.stretch === "extended") return "break";
  if (prior.stretch === "normal") return "continue";
  return "unclear";
}
