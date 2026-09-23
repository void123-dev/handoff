import assert from "node:assert/strict";
import { test } from "node:test";
import { advice, resolvePhase, sessionPhase } from "./phase.ts";
import { activeJunction, sessionOpenMs, waitNextEligible } from "./sessionClock.ts";
import type { FlowBar } from "./types.ts";
import { shouldEmitWaitNext, waitNextFingerprint, waitNextTelegram } from "./watch.ts";

const NY_0840 = Date.parse("2026-09-22T12:40:00.000Z");
const NY_1030 = Date.parse("2026-09-22T14:30:00.000Z");

function quietBars(start: number, count: number, patch?: (i: number, bar: FlowBar) => FlowBar): FlowBar[] {
  const out: FlowBar[] = [];
  for (let i = 0; i < count; i++) {
    const faded = i >= count - 6;
    let bar: FlowBar = {
      t: start + i * 5 * 60_000,
      o: 100,
      h: 101,
      l: 99.5,
      c: 100.02,
      notional: faded ? 100 : 1000,
      delta: i % 2 === 0 ? 1 : -1,
    };
    if (patch) bar = patch(i, bar);
    out.push(bar);
  }
  return out;
}

test("08:40 ET NY inside and faded is still awaiting, not wait_next", () => {
  const clock = activeJunction(NY_0840);
  assert.equal(clock.junction, "london_to_ny");
  assert.equal(clock.awaiting, true);
  assert.equal(waitNextEligible(NY_0840), false);
  const open = sessionOpenMs(NY_0840, "ny");
  const bars = quietBars(open, 9);
  const phase = resolvePhase({
    now: NY_0840,
    lean: "unclear",
    n: 69,
    pInside: 0.06,
    priorHigh: 110,
    priorLow: 90,
    bars,
  });
  assert.equal(phase.sessionPhase, "awaiting");
  assert.notEqual(phase.sessionPhase, "wait_next");
  assert.equal(phase.advice, "wait_junction");
});

test("10:30 ET NY inside, vol fade, CVD flat, quiet 5m, lean unclear → wait_next", () => {
  assert.equal(waitNextEligible(NY_1030), true);
  assert.equal(activeJunction(NY_1030).awaiting, false);
  const open = sessionOpenMs(NY_1030, "ny");
  const bars = quietBars(open, 30);
  const phase = resolvePhase({
    now: NY_1030,
    lean: "unclear",
    n: 69,
    pInside: 0.06,
    priorHigh: 110,
    priorLow: 90,
    bars,
  });
  assert.equal(phase.insidePrior, true);
  assert.equal(phase.volFade, true);
  assert.equal(phase.cvdFlat, true);
  assert.ok(phase.neutralVotes >= 3);
  assert.equal(phase.sessionPhase, "wait_next");
  assert.equal(phase.advice, "wait_next_session");
  assert.equal(phase.headline, "Wait next · NY stale · inside London · vol faded · CVD flat");
  assert.match(phase.headlineRu, /Ждать следующую/);
});

test("10:30 ET took London high and held → resolved, not wait_next", () => {
  const open = sessionOpenMs(NY_1030, "ny");
  const bars = quietBars(open, 30, (i, bar) =>
    i === 29 ? { ...bar, h: 120, c: 115, l: 100 } : bar,
  );
  const phase = resolvePhase({
    now: NY_1030,
    lean: "unclear",
    n: 69,
    pInside: 0.06,
    priorHigh: 110,
    priorLow: 90,
    bars,
  });
  assert.equal(phase.sessionPhase, "resolved");
  assert.notEqual(phase.sessionPhase, "wait_next");
});

test("Gravity fight stays live", () => {
  const open = sessionOpenMs(NY_1030, "ny");
  const phase = resolvePhase({
    now: NY_1030,
    lean: "unclear",
    n: 69,
    pInside: 0.06,
    priorHigh: 110,
    priorLow: 90,
    bars: quietBars(open, 30),
    layers: { gravity: { source: "live", coupling: "fight", g: 0.4 } },
  });
  assert.equal(phase.fight, true);
  assert.equal(phase.sessionPhase, "live");
  assert.equal(advice("live", "unclear"), "wait_junction");
});

test("COIL armed stays live", () => {
  const open = sessionOpenMs(NY_1030, "ny");
  const phase = resolvePhase({
    now: NY_1030,
    lean: "unclear",
    n: 69,
    pInside: 0.5,
    priorHigh: 110,
    priorLow: 90,
    bars: quietBars(open, 30),
    layers: { coil: { source: "live", armed: true } },
  });
  assert.equal(phase.coilArmed, true);
  assert.equal(phase.sessionPhase, "live");
});

test("demo ANVIL does not count toward the 3 votes", () => {
  const open = sessionOpenMs(NY_1030, "ny");
  const bars = quietBars(open, 30, (i, bar) =>
    i >= 24 ? { ...bar, delta: 10 } : bar,
  );
  const phase = resolvePhase({
    now: NY_1030,
    lean: "unclear",
    n: 69,
    pInside: 0.06,
    priorHigh: 110,
    priorLow: 90,
    bars,
    layers: { anvil: { source: "demo", state: "UNCLEAR", a: 0.01 } },
  });
  assert.equal(phase.insidePrior, true);
  assert.equal(phase.volFade, true);
  assert.equal(phase.cvdFlat, false);
  assert.equal(phase.neutralVotes, 2);
  assert.equal(phase.sessionPhase, "live");
});

test("sessionPhase blocks wait_next before eligible and on a range break", () => {
  assert.equal(
    sessionPhase({
      awaiting: true,
      eligible: false,
      sessionEnded: false,
      brokePriorRange: false,
      neutralVotes: 5,
      fight: false,
      coilArmed: false,
    }),
    "awaiting",
  );
  assert.equal(
    sessionPhase({
      awaiting: false,
      eligible: true,
      sessionEnded: false,
      brokePriorRange: true,
      neutralVotes: 5,
      fight: false,
      coilArmed: false,
    }),
    "resolved",
  );
});

test("telegram fires once per fingerprint on live|awaiting → wait_next", () => {
  const fp = waitNextFingerprint("BTC", "london_to_ny", "2026-09-22");
  assert.equal(fp, "wait_next:BTC:london_to_ny:2026-09-22");
  assert.equal(shouldEmitWaitNext("awaiting", "wait_next", false), true);
  assert.equal(shouldEmitWaitNext("live", "wait_next", false), true);
  assert.equal(shouldEmitWaitNext("live", "wait_next", true), false);
  assert.equal(shouldEmitWaitNext("wait_next", "wait_next", false), false);
  const text = waitNextTelegram("BTC", "london→ny");
  assert.match(text, /INFO · wait_next/);
  assert.match(text, /Стык london→ny выдохся/);
  assert.match(text, /Фильтр, не ордер/);
  assert.doesNotMatch(text, /\bbuy\b|\bsell\b|купить|продать/i);
});
