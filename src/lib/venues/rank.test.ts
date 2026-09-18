import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultPit, sortPits, type Pit } from "./rank.ts";

test("live pits rank ahead of higher-volume demo Binance", () => {
  const pits: Pit[] = [
    { id: "binance", label: "Binance", source: "demo", volumeUsd: 900_000_000 },
    { id: "okx", label: "OKX", source: "live", volumeUsd: 120_000_000 },
    { id: "bybit", label: "Bybit", source: "demo", volumeUsd: 80_000_000 },
  ];
  const ranked = sortPits(pits);
  assert.equal(ranked[0]?.id, "okx");
  assert.equal(ranked[1]?.id, "binance");
  assert.equal(ranked[2]?.id, "bybit");
  assert.equal(defaultPit(pits).id, "okx");
});

test("among live pits, higher volumeUsd wins", () => {
  const pits: Pit[] = [
    { id: "okx", label: "OKX", source: "live", volumeUsd: 120_000_000 },
    { id: "binance", label: "Binance", source: "live", volumeUsd: 900_000_000 },
  ];
  assert.equal(defaultPit(pits).id, "binance");
});

test("if no pit is live, largest-volume demo wins", () => {
  const pits: Pit[] = [
    { id: "okx", label: "OKX", source: "demo", volumeUsd: 120_000_000 },
    { id: "binance", label: "Binance", source: "demo", volumeUsd: 900_000_000 },
  ];
  const d = defaultPit(pits);
  assert.equal(d.id, "binance");
  assert.equal(d.source, "demo");
});
