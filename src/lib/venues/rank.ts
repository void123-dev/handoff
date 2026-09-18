/** Live pits always rank ahead of demo, even when the demo pit has higher volume. */
export type PitSource = "live" | "demo";

export type Pit = {
  id: string;
  label: string;
  source: PitSource;
  volumeUsd: number;
};

export function sortPits(pits: Pit[]): Pit[] {
  return [...pits].sort((a, b) => {
    if (a.source !== b.source) return a.source === "live" ? -1 : 1;
    if (b.volumeUsd !== a.volumeUsd) return b.volumeUsd - a.volumeUsd;
    return a.id.localeCompare(b.id);
  });
}

export function defaultPit(pits: Pit[]): Pit {
  const ranked = sortPits(pits);
  const live = ranked.find((p) => p.source === "live");
  return live ?? ranked[0]!;
}
