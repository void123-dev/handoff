import assert from "node:assert/strict";
import { test } from "node:test";
import { activeJunction, etParts } from "./sessionClock.ts";

test("16:00–18:59 ET → ny_to_asia awaiting", () => {
  const winter1600 = Date.parse("2026-01-15T21:00:00.000Z");
  const winter1859 = Date.parse("2026-01-15T23:59:00.000Z");
  const summer1700 = Date.parse("2026-07-15T21:00:00.000Z");
  for (const ms of [winter1600, winter1859, summer1700]) {
    const { hour } = etParts(ms);
    assert.ok(hour >= 16 && hour < 19, `hour ${hour} for ${new Date(ms).toISOString()}`);
    const j = activeJunction(ms);
    assert.equal(j.junction, "ny_to_asia");
    assert.equal(j.from, "ny");
    assert.equal(j.to, "asia");
    assert.equal(j.awaiting, true);
  }
});

test("19:00 ET is ny_to_asia not awaiting", () => {
  const winter1900 = Date.parse("2026-01-16T00:00:00.000Z");
  const { hour } = etParts(winter1900);
  assert.equal(hour, 19);
  const j = activeJunction(winter1900);
  assert.equal(j.junction, "ny_to_asia");
  assert.equal(j.awaiting, false);
});
