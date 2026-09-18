import { createFileRoute } from "@tanstack/react-router";
import { DeskApp } from "@/components/desk-app";
import { parseHandoffQuery, parseVenueId } from "@/lib/query";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => {
    const u = new URL("http://local/");
    for (const key of ["symbol", "lookback", "locale"] as const) {
      const v = search[key];
      if (v != null) u.searchParams.set(key, String(v));
    }
    const q = parseHandoffQuery(u);
    const venue = parseVenueId(search.venue);
    return {
      symbol: q.symbol,
      lookback: q.lookback,
      locale: q.locale,
      ...(venue ? { venue } : {}),
    };
  },
  component: Home,
});

function Home() {
  const search = Route.useSearch();
  return (
    <main>
      <DeskApp search={search} />
    </main>
  );
}
