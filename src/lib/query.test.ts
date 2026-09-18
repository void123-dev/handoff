import assert from "node:assert/strict";
import { test } from "node:test";
import { parseHandoffQuery } from "./query.ts";

test("invalid query falls back to defaults, never throws", () => {
  const q = parseHandoffQuery(
    "http://local/api/handoff?symbol=DOGECOIN&venue=kraken&lookback=7&format=xml",
  );
  assert.equal(q.symbol, "BTC");
  assert.equal(q.venue, "okx");
  assert.equal(q.lookback, 180);
  assert.equal(q.format, "json");
});

test("omitted venue is okx fallback, marked omitted", () => {
  const q = parseHandoffQuery("http://local/api/desk?symbol=BTC");
  assert.equal(q.venue, "okx");
  assert.equal(q.venueOmitted, true);
});

test("valid query is kept", () => {
  const q = parseHandoffQuery(
    "http://local/api/handoff?symbol=eth&venue=okx&lookback=360&format=csv",
  );
  assert.equal(q.symbol, "ETH");
  assert.equal(q.venue, "okx");
  assert.equal(q.lookback, 360);
  assert.equal(q.format, "csv");
  assert.equal(q.venueOmitted, false);
});
