/** Empirical next-session outcomes. Finest matching key with n ≥ 40; otherwise coarsen. */
export type MemoryRow = {
  t: number;
  junction: string;
  stuck: boolean;
  pressedHigh: boolean;
  pressedLow: boolean;
  stretch: string;
  closeLoc: string;
  sweep: string;
  weekend: boolean;
  continued: boolean | null;
  inside: boolean;
  brokeHigh: boolean;
  brokeLow: boolean;
};

export type MemoryKey = {
  junction: string;
  pressed?: "pressedHigh" | "pressedLow" | "stuck" | "other";
  stretch?: string;
  closeLoc?: string;
  sweep?: string;
  weekend?: boolean;
};

export function rowPressed(r: MemoryRow): MemoryKey["pressed"] {
  if (r.pressedHigh) return "pressedHigh";
  if (r.pressedLow) return "pressedLow";
  if (r.stuck) return "stuck";
  return "other";
}

export function match(row: MemoryRow, key: MemoryKey) {
  if (row.junction !== key.junction) return false;
  if (key.pressed && rowPressed(row) !== key.pressed) return false;
  if (key.stretch && row.stretch !== key.stretch) return false;
  if (key.closeLoc && row.closeLoc !== key.closeLoc) return false;
  if (key.sweep && row.sweep !== key.sweep) return false;
  if (key.weekend !== undefined && row.weekend !== key.weekend) return false;
  return true;
}

export function frequencies(rows: MemoryRow[]) {
  const n = rows.length;
  const signed = rows.filter((r) => r.continued !== null);
  return {
    n,
    pInside: n ? rows.filter((r) => r.inside).length / n : null,
    pBrokeHigh: n ? rows.filter((r) => r.brokeHigh).length / n : null,
    pBrokeLow: n ? rows.filter((r) => r.brokeLow).length / n : null,
    pBoth: n ? rows.filter((r) => r.brokeHigh && r.brokeLow).length / n : null,
    pContinue: signed.length
      ? signed.filter((r) => r.continued).length / signed.length
      : null,
    nSigned: signed.length,
  };
}

export function selectBucket(all: MemoryRow[], seed: MemoryKey, minN = 40) {
  const attempts: MemoryKey[] = [
    { ...seed },
    {
      junction: seed.junction,
      pressed: seed.pressed,
      stretch: seed.stretch,
      closeLoc: seed.closeLoc,
    },
    { junction: seed.junction, pressed: seed.pressed, stretch: seed.stretch },
    { junction: seed.junction, pressed: seed.pressed },
    {
      junction: seed.junction,
      stretch: seed.stretch,
      closeLoc: seed.closeLoc,
    },
    { junction: seed.junction },
  ];
  for (const key of attempts) {
    const rows = all.filter((r) => match(r, key));
    if (rows.length >= minN || (key.pressed === undefined && !key.stretch)) {
      return { key, rows, frequencies: frequencies(rows), thin: rows.length < minN };
    }
  }
  const rows = all.filter((r) => r.junction === seed.junction);
  return {
    key: { junction: seed.junction },
    rows,
    frequencies: frequencies(rows),
    thin: rows.length < minN,
  };
}
