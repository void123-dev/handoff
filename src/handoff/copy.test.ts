import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { labels } from "../lib/labels.ts";
import { EXPORT_README } from "../lib/export-schema.ts";
import { headlineHasOrderCopy } from "./headlines.ts";

test("no buy/sell copy in UI labels or readme", () => {
  const blobs = [
    JSON.stringify(labels),
    EXPORT_README.lean,
    EXPORT_README.memory,
    readFileSync(new URL("../components/desk-app.tsx", import.meta.url), "utf8"),
  ];
  for (const blob of blobs) {
    assert.equal(headlineHasOrderCopy(blob), false);
    assert.doesNotMatch(blob, /пробой/);
  }
});
