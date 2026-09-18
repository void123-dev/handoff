import assert from "node:assert/strict";
import { test } from "node:test";
import { leanRule } from "./lean.ts";
import { applyOverlay } from "./overlay.ts";
import { pressedFromPrior6 } from "./sessionPrint.ts";
import type { RawSession, SessionPrint } from "./types.ts";

function print(partial: Partial<SessionPrint>): SessionPrint {
  return {
    name: "london",
    start: 0,
    end: 1,
    open: 100,
    high: 101,
    low: 99,
    close: 100.1,
    ret: 0.001,
    range: 2,
    closeLoc: "mid",
    closeLocRatio: 0.5,
    stretch: "normal",
    stretchRatio: 1,
    flat: false,
    stuck: false,
    sweep: "none",
    atPriorHigh: false,
    atPriorLow: false,
    pressedHigh: false,
    pressedLow: false,
    weekend: false,
    ...partial,
  };
}

test("flat London → lean unclear", () => {
  const prior = print({ name: "london", flat: true, closeLoc: "high", ret: 0.0002 });
  assert.equal(leanRule(prior), "unclear");
});

test("stuck=true → overlay does not emit continue", () => {
  const vetoed = applyOverlay(
    "continue",
    { n: 58, pInside: 0.51, pBrokeHigh: 0.22, pBrokeLow: 0.18, pContinue: 0.7 },
    true,
  );
  assert.equal(vetoed, "unclear");
  const also = applyOverlay(
    "continue",
    { n: 80, pInside: 0.2, pBrokeHigh: 0.5, pBrokeLow: 0.2, pContinue: 0.8 },
    true,
  );
  assert.equal(also, "unclear");
});

test("n<40 → overlay lean unclear", () => {
  const lean = applyOverlay(
    "break",
    { n: 22, pInside: 0.6, pBrokeHigh: 0.2, pBrokeLow: 0.2, pContinue: 0.3 },
    false,
  );
  assert.equal(lean, "unclear");
});

test("pressedHigh is computed from prior 6 session highs, not from a drawn level", () => {
  const priorSix: RawSession[] = Array.from({ length: 6 }, (_, i) => ({
    name: i % 2 === 0 ? "ny" : "asia",
    start: i,
    end: i + 1,
    open: 100,
    high: 110,
    low: 90,
    close: 100,
  }));
  const atRange: RawSession = {
    name: "london",
    start: 10,
    end: 11,
    open: 108,
    high: 110,
    low: 104,
    close: 109.6,
  };
  const hit = pressedFromPrior6(atRange, priorSix, "high", false);
  assert.equal(hit.atPriorHigh, true);
  assert.equal(hit.pressedHigh, true);

  const inside: RawSession = { ...atRange, high: 100, low: 95, close: 99 };
  const miss = pressedFromPrior6(inside, priorSix, "high", false);
  assert.equal(miss.atPriorHigh, false);
  assert.equal(miss.pressedHigh, false);
  assert.equal(typeof pressedFromPrior6, "function");
});
