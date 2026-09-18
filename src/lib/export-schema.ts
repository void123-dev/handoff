export const HANDOFF_SCHEMA = {
  api: "handoff-export",
  version: "1.1",
  model: "HANDOFF-1.1",
  endpoints: {
    snapshot: "GET /api/handoff?symbol=BTC&venue=okx&lookback=180",
    desk: "GET /api/desk?symbol=BTC&venue=okx&lookback=180",
    memory: "GET /api/memory?symbol=BTC&venue=okx&lookback=180",
    exportJson: "GET /api/export?symbol=BTC&venue=okx&lookback=180&format=json",
    exportCsv: "GET /api/export?symbol=BTC&venue=okx&lookback=180&format=csv",
    venues: "GET /api/venues",
    schema: "GET /api/export?format=schema",
  },
  query: {
    symbol: ["BTC", "ETH", "SOL", "XRP", "DOGE", "BNB"],
    venue: ["binance", "bybit", "okx"],
    lookback: [90, 180, 360],
    format: ["json", "csv", "schema"],
  },
  snapshot: {
    fields: [
      "model",
      "symbol",
      "venue",
      "lookback",
      "source",
      "asOf",
      "lean",
      "pContinue",
      "pInside",
      "pBrokeHigh",
      "pBrokeLow",
      "n",
      "thin",
      "prior",
      "stretch",
      "closeLoc",
      "sweptPrior",
      "weekend",
      "deadZone",
      "stuck",
      "pressedHigh",
      "pressedLow",
      "junction",
      "awaiting",
      "headline",
      "headlineRu",
      "memory",
      "ticks",
    ],
    lean: "continue | break | unclear. Filter at the junction, not an order.",
    source: "live | demo. Never a venue id.",
    memory:
      "Empirical next-session range outcome in the current bucket. n<40 → unclear.",
  },
  csv: "asOf,symbol,venue,lookback,source,lean,junction,awaiting,n,pInside,pBrokeHigh,pBrokeLow,pBoth,pContinue,stretch,closeLoc,stuck,pressedHigh,pressedLow,sweep,weekend,deadZone,thin,headline",
  cors: true,
  auth: "none",
  readme: {
    lean: "continue | break | unclear. Filter at the junction, not an order.",
    memory: "Empirical next-session range outcome in the current bucket. n<40 → unclear.",
  },
};

export const EXPORT_README = {
  lean: "continue | break | unclear. Filter at the junction, not an order.",
  memory: "Empirical next-session range outcome in the current bucket. n<40 → unclear.",
  source: "live | demo. Never a venue id. Demo rows are not voted.",
};

export function snapshotToCsv(snapshot: {
  asOf: number;
  symbol: string;
  venue: string;
  lookback: number;
  source: string;
  lean: string;
  junction: string;
  awaiting: boolean;
  n: number;
  memory: {
    pInside: number | null;
    pBrokeHigh: number | null;
    pBrokeLow: number | null;
    pBoth: number | null;
    pContinue: number | null;
    thin: boolean;
  };
  stretch: string | null;
  closeLoc: string | null;
  stuck: boolean;
  pressedHigh: boolean;
  pressedLow: boolean;
  sweptPrior: string | null;
  weekend: boolean;
  deadZone: boolean;
  headline: string;
}): string {
  const header = HANDOFF_SCHEMA.csv;
  const cells = [
    snapshot.asOf,
    snapshot.symbol,
    snapshot.venue,
    snapshot.lookback,
    snapshot.source,
    snapshot.lean,
    snapshot.junction,
    snapshot.awaiting,
    snapshot.n,
    snapshot.memory.pInside,
    snapshot.memory.pBrokeHigh,
    snapshot.memory.pBrokeLow,
    snapshot.memory.pBoth,
    snapshot.memory.pContinue,
    snapshot.stretch,
    snapshot.closeLoc,
    snapshot.stuck,
    snapshot.pressedHigh,
    snapshot.pressedLow,
    snapshot.sweptPrior,
    snapshot.weekend,
    snapshot.deadZone,
    snapshot.memory.thin,
    JSON.stringify(snapshot.headline),
  ];
  return `${header}\n${cells.join(",")}\n`;
}
