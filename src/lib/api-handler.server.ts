/** Public JSON desk API. CORS * on GET. No auth. Omitted venue resolves to the live-first catalog default. */
import { corsJson, corsOptions, corsText } from "@/lib/cors";
import { EXPORT_README, HANDOFF_SCHEMA, snapshotToCsv } from "@/lib/export-schema";
import { parseHandoffQuery, type HandoffQuery } from "@/lib/query";
import { deskCard, getHandoffBundle, memoryPayload } from "@/lib/snapshot.server";
import { getVenueCatalog } from "@/lib/venues/catalog.server";

export { corsOptions };

async function resolveQuery(request: Request): Promise<HandoffQuery> {
  const q = parseHandoffQuery(request.url);
  if (q.venueOmitted) {
    const catalog = await getVenueCatalog();
    q.venue = catalog.default.venue;
  }
  return q;
}

export async function handleExport(request: Request): Promise<Response> {
  const q = parseHandoffQuery(request.url);
  if (q.format === "schema") return corsJson(HANDOFF_SCHEMA);
  const resolved = await resolveQuery(request);
  const bundle = await getHandoffBundle(resolved);
  if (resolved.format === "csv") {
    return corsText(snapshotToCsv(bundle.snapshot), "text/csv; charset=utf-8");
  }
  return corsJson({
    api: "handoff-export",
    version: "1.1",
    model: "HANDOFF-1.1",
    readme: EXPORT_README,
    query: resolved,
    snapshot: bundle.snapshot,
    card: deskCard(bundle.snapshot),
  });
}

export async function handleHandoff(request: Request): Promise<Response> {
  const q = await resolveQuery(request);
  const bundle = await getHandoffBundle(q);
  return corsJson(bundle.snapshot);
}

export async function handleDesk(request: Request): Promise<Response> {
  const q = await resolveQuery(request);
  const bundle = await getHandoffBundle(q);
  return corsJson(deskCard(bundle.snapshot));
}

export async function handleMemory(request: Request): Promise<Response> {
  const q = await resolveQuery(request);
  const bundle = await getHandoffBundle(q);
  return corsJson(memoryPayload(bundle));
}

export async function handleVenues(): Promise<Response> {
  const catalog = await getVenueCatalog();
  return corsJson({
    pits: catalog.pits,
    default: catalog.default,
    export: "/api/export",
    handoff: "/api/handoff",
    desk: "/api/desk",
    memory: "/api/memory",
    note: "Session junction only. Live pits rank ahead of higher-volume demo. Neighbors are not in the bucket key.",
  });
}
