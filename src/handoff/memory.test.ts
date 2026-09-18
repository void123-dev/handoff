import assert from "node:assert/strict";
import { test } from "node:test";
import { selectBucket, type MemoryRow } from "./memory.ts";

function row(partial: Partial<MemoryRow>): MemoryRow {
  return {
    t: 1,
    junction: "london_to_ny",
    stuck: false,
    pressedHigh: false,
    pressedLow: false,
    stretch: "normal",
    closeLoc: "high",
    sweep: "none",
    weekend: false,
    continued: true,
    inside: true,
    brokeHigh: false,
    brokeLow: false,
    ...partial,
  };
}

test("selectBucket drops sweep before junction", () => {
  const rows: MemoryRow[] = [];
  for (let i = 0; i < 50; i++) {
    rows.push(
      row({
        t: i,
        sweep: i < 5 ? "high" : "none",
        stretch: "normal",
        closeLoc: "high",
      }),
    );
  }
  const result = selectBucket(
    rows,
    {
      junction: "london_to_ny",
      pressed: "other",
      stretch: "normal",
      closeLoc: "high",
      sweep: "high",
      weekend: false,
    },
    40,
  );
  assert.equal(result.key.sweep, undefined);
  assert.equal(result.key.junction, "london_to_ny");
  assert.ok(result.rows.length >= 40);
  assert.equal(result.thin, false);
});

test("n<40 → thin", () => {
  const rows = Array.from({ length: 22 }, (_, i) => row({ t: i }));
  const result = selectBucket(rows, { junction: "london_to_ny" }, 40);
  assert.equal(result.thin, true);
  assert.equal(result.frequencies.n, 22);
});
