import { z } from "zod";

export const SYMBOLS = ["BTC", "ETH", "SOL", "XRP", "DOGE", "BNB"] as const;
export const VENUES = ["binance", "bybit", "okx"] as const;
export const LOOKBACKS = [90, 180, 360] as const;
export const FORMATS = ["json", "csv", "schema"] as const;
export const LOCALES = ["en", "ru"] as const;

export type SymbolId = (typeof SYMBOLS)[number];
export type VenueId = (typeof VENUES)[number];
export type Lookback = (typeof LOOKBACKS)[number];
export type ExportFormat = (typeof FORMATS)[number];
export type LocaleId = (typeof LOCALES)[number];

export const FALLBACK_VENUE: VenueId = "okx";

export type HandoffQuery = {
  symbol: SymbolId;
  venue: VenueId;
  lookback: Lookback;
  format: ExportFormat;
  locale: LocaleId;
  venueOmitted: boolean;
};

function envVenue(): VenueId | undefined {
  const env = typeof process !== "undefined" ? process.env.HANDOFF_DEFAULT_VENUE : undefined;
  if (env && (VENUES as readonly string[]).includes(env)) return env as VenueId;
  return undefined;
}

export function staticDefaultVenue(): VenueId {
  return envVenue() ?? FALLBACK_VENUE;
}

const symbolSchema = z.enum(SYMBOLS).catch("BTC");
const venueSchema = z.enum(VENUES).catch(FALLBACK_VENUE);
const lookbackSchema = z
  .union([z.literal(90), z.literal(180), z.literal(360), z.string()])
  .transform((v) => Number(v))
  .pipe(z.union([z.literal(90), z.literal(180), z.literal(360)]))
  .catch(180);
const formatSchema = z.enum(FORMATS).catch("json");
const localeSchema = z.enum(LOCALES).catch("en");

export function parseHandoffQuery(url: URL | string): HandoffQuery {
  const u = typeof url === "string" ? new URL(url, "http://local") : url;
  const rawVenue = u.searchParams.get("venue");
  const venueOmitted = rawVenue == null || rawVenue === "";
  const venueRaw = venueOmitted ? staticDefaultVenue() : rawVenue;
  return {
    symbol: symbolSchema.parse((u.searchParams.get("symbol") ?? "BTC").toUpperCase()),
    venue: venueSchema.parse(String(venueRaw).toLowerCase()),
    lookback: lookbackSchema.parse(u.searchParams.get("lookback") ?? "180"),
    format: formatSchema.parse((u.searchParams.get("format") ?? "json").toLowerCase()),
    locale: localeSchema.parse((u.searchParams.get("locale") ?? "en").toLowerCase()),
    venueOmitted,
  };
}

export function parseVenueId(raw: unknown): VenueId | undefined {
  if (typeof raw !== "string") return undefined;
  const v = raw.toLowerCase();
  return (VENUES as readonly string[]).includes(v) ? (v as VenueId) : undefined;
}
