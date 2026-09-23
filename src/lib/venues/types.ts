import type { Candle, FlowBar } from "@/handoff/types";
import type { VenueId } from "@/lib/query";

export type VenueAdapter = {
  id: VenueId;
  label: string;
  volumeUsd: number;
  fetch1h: (symbol: string, start: number, end: number) => Promise<Candle[]>;
  fetch5m: (symbol: string, start: number, end: number) => Promise<FlowBar[]>;
};
