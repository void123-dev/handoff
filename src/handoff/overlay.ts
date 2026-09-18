/**
 * Memory overlay. Never upgrades a lean. Thin samples, stuck continues, and
 * mixed frequencies collapse to unclear. This layer is a filter, not an order.
 */
import type { Lean } from "./types.ts";

export type OverlayFreq = {
  n: number;
  pInside: number | null;
  pBrokeHigh: number | null;
  pBrokeLow: number | null;
  pContinue: number | null;
};

export function applyOverlay(lean: Lean, freq: OverlayFreq, stuck: boolean): Lean {
  const pInside = freq.pInside ?? 0;
  const pBrokeHigh = freq.pBrokeHigh ?? 0;
  const pBrokeLow = freq.pBrokeLow ?? 0;
  const maxP = Math.max(pInside, pBrokeHigh, pBrokeLow);
  if (freq.n < 40 || maxP < 0.4) return "unclear";
  if (pInside >= 0.45 && stuck) return "unclear";
  if (stuck && lean === "continue") return "unclear";
  if (lean === "continue" && freq.pContinue != null && freq.pContinue < 0.56) return "unclear";
  if (lean === "break" && freq.pContinue != null && freq.pContinue > 0.44) return "unclear";
  return lean;
}
