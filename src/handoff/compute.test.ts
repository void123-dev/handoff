import assert from "node:assert/strict";
import { test } from "node:test";
import { computeHandoff } from "./compute.ts";
import { demoCandles } from "./demo.ts";
import { headlineHasOrderCopy, makeHeadlines } from "./headlines.ts";
import { buildArchivePairs } from "./pairs.ts";
import { buildRawSessions, printSessions } from "./sessionPrint.ts";
import type { ArchiveRow } from "./types.ts";

test("demo never source: binance", () => {
  const now = Date.parse("2026-01-15T21:30:00.000Z");
  const candles = demoCandles("BTC", "binance", now);
  const printed = printSessions(buildRawSessions(candles, now), 180);
  const archive = buildArchivePairs(printed, "BTC", "binance");
  const snap = computeHandoff({
    printed,
    archive,
    now,
    lookback: 180,
    symbol: "BTC",
    venue: "binance",
    source: "demo",
  });
  assert.equal(snap.source, "demo");
  assert.notEqual(snap.source, "binance");
  assert.equal(snap.memory.pSource, "demo");
  assert.ok(candles.length > 100);
});

test("n<40 → thin and lean unclear", () => {
  const now = Date.parse("2026-01-15T21:30:00.000Z");
  const archive: ArchiveRow[] = Array.from({ length: 12 }, (_, i) => ({
    t: i,
    junction: "ny_to_asia",
    symbol: "BTC",
    venue: "binance",
    priorName: "ny",
    priorRet: 0.01,
    priorRange: 100,
    closeLoc: "high",
    stretch: "normal",
    sweep: "none",
    stuck: false,
    pressedHigh: false,
    pressedLow: false,
    weekend: false,
    nextRet: 0.004,
    nextRange: 80,
    brokeHigh: false,
    brokeLow: false,
    inside: true,
    continued: true,
  }));
  const snap = computeHandoff({
    printed: [],
    archive,
    now,
    lookback: 180,
    symbol: "BTC",
    venue: "binance",
    source: "demo",
  });
  assert.equal(snap.memory.thin, true);
  assert.equal(snap.lean, "unclear");
  assert.match(snap.headline, /thin sample/);
  assert.match(snap.headlineRu, /тонкая выборка/);
});

test("no buy/sell copy in headlines", () => {
  const samples = [
    makeHeadlines({
      lean: "unclear",
      junction: "london_to_ny",
      stuck: true,
      memory: {
        key: { junction: "london_to_ny" },
        thin: false,
        n: 58,
        pInside: 0.51,
        pBrokeHigh: 0.2,
        pBrokeLow: 0.2,
        pBoth: 0.04,
        pContinue: 0.4,
        pSource: "bucket",
        warning: null,
      },
    }),
    makeHeadlines({
      lean: "break",
      junction: "london_to_ny",
      stuck: false,
      memory: {
        key: { junction: "london_to_ny" },
        thin: false,
        n: 73,
        pInside: 0.2,
        pBrokeHigh: 0.3,
        pBrokeLow: 0.46,
        pBoth: 0.05,
        pContinue: 0.41,
        pSource: "bucket",
        warning: null,
      },
    }),
    makeHeadlines({
      lean: "unclear",
      junction: "london_to_ny",
      stuck: false,
      memory: {
        key: { junction: "london_to_ny" },
        thin: true,
        n: 22,
        pInside: 0.4,
        pBrokeHigh: 0.3,
        pBrokeLow: 0.3,
        pBoth: 0,
        pContinue: 0.5,
        pSource: "rule",
        warning: "thin_sample",
      },
    }),
  ];
  for (const s of samples) {
    assert.equal(headlineHasOrderCopy(s.headline), false, s.headline);
    assert.equal(headlineHasOrderCopy(s.headlineRu), false, s.headlineRu);
    assert.doesNotMatch(s.headlineRu, /пробой/);
  }
});
