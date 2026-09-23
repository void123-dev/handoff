import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { pct } from "@/handoff/math";
import { junctionArrow } from "@/handoff/sessionClock";
import type { HandoffSnapshot, Lean, TickMark } from "@/handoff/types";
import { labels, type LocaleId } from "@/lib/labels";
import { LOOKBACKS, SYMBOLS, type Lookback, type SymbolId, type VenueId } from "@/lib/query";
import type { Pit } from "@/lib/venues/rank";
import { cn } from "@/lib/utils";

type Search = {
  symbol: SymbolId;
  venue?: VenueId;
  lookback: Lookback;
  locale: LocaleId;
};

type VenuesPayload = {
  pits: Pit[];
  default: { venue: VenueId; lookback: number };
};

const MARK_COLOR: Record<TickMark, string> = {
  I: "var(--color-inside)",
  B: "var(--color-break)",
  C: "var(--color-continue)",
};

const LEAN_TONE: Record<Lean, string> = {
  continue: "bg-continue/15 text-continue ring-continue/30",
  break: "bg-break/15 text-break ring-break/30",
  unclear: "bg-unclear/15 text-unclear ring-unclear/30",
};

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-full px-3.5 text-sm font-medium tracking-wide transition-transform duration-150 ease-out active:scale-95",
        active
          ? "bg-accent text-bg"
          : "bg-elevated text-muted shadow-[var(--shadow-border)] hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

function fmtPx(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 1 });
  if (n >= 1) return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return n.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function fmtRet(n: number | null | undefined): string {
  if (n == null) return "—";
  const prefix = n > 0 ? "+" : "";
  return `${prefix}${(n * 100).toFixed(2)}%`;
}

async function fetchVenues(): Promise<VenuesPayload> {
  const res = await fetch("/api/venues");
  if (!res.ok) throw new Error("venues");
  return (await res.json()) as VenuesPayload;
}

async function fetchHandoff(search: Search): Promise<HandoffSnapshot> {
  const q = new URLSearchParams({
    symbol: search.symbol,
    lookback: String(search.lookback),
  });
  if (search.venue) q.set("venue", search.venue);
  const res = await fetch(`/api/handoff?${q}`);
  if (!res.ok) throw new Error("handoff");
  return (await res.json()) as HandoffSnapshot;
}

function asVenue(raw: string | undefined): VenueId | undefined {
  if (raw === "binance" || raw === "bybit" || raw === "okx") return raw;
  return undefined;
}

export function DeskApp({ search }: { search: Search }) {
  const t = labels[search.locale];
  const navigate = useNavigate();
  const venuesQ = useQuery({
    queryKey: ["venues"],
    queryFn: fetchVenues,
    staleTime: 45_000,
  });
  const q = useQuery({
    queryKey: ["handoff", search.symbol, search.venue ?? "auto", search.lookback],
    queryFn: () => fetchHandoff(search),
  });
  const venue: VenueId =
    search.venue ?? venuesQ.data?.default.venue ?? asVenue(q.data?.venue) ?? "okx";
  const pits = venuesQ.data?.pits ?? [];

  const set = (patch: Partial<Search>) => {
    void navigate({
      to: "/",
      search: { ...search, venue, ...patch },
    });
  };

  const snap = q.data;
  const headline = search.locale === "ru" ? snap?.headlineRu : snap?.headline;

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs tracking-[0.22em] text-muted">{t.model}</p>
          <h1 className="mt-1 text-4xl font-medium tracking-[-0.04em] text-balance sm:text-5xl">
            {t.name}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted text-pretty">{t.tagline}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span className="whitespace-nowrap rounded-full bg-elevated px-3 py-2 font-mono text-xs text-muted shadow-[var(--shadow-border)]">
            {snap?.source === "demo" ? t.demo : `${t.liveFeed} · ${venue}`}
          </span>
          {snap?.deadZone ? (
            <span className="rounded-full bg-unclear/15 px-3 py-2 font-mono text-xs text-unclear">
              {t.deadZone}
            </span>
          ) : null}
        </div>
      </header>

      <section className="flex flex-col gap-3" aria-label="filters">
        <ChipRow label={t.symbol}>
          {SYMBOLS.map((s) => (
            <Chip key={s} active={search.symbol === s} onClick={() => set({ symbol: s })}>
              {s}
            </Chip>
          ))}
        </ChipRow>
        <ChipRow label={t.venue}>
          {(pits.length ? pits.map((p) => p.id as VenueId) : (["okx", "binance", "bybit"] as VenueId[])).map(
            (v) => (
              <Chip key={v} active={venue === v} onClick={() => set({ venue: v })}>
                {v}
              </Chip>
            ),
          )}
        </ChipRow>
        <div className="flex flex-wrap gap-3">
          <ChipRow label={t.lookback}>
            {LOOKBACKS.map((n) => (
              <Chip key={n} active={search.lookback === n} onClick={() => set({ lookback: n })}>
                {String(n)}
              </Chip>
            ))}
          </ChipRow>
          <ChipRow label={t.locale}>
            <Chip active={search.locale === "en"} onClick={() => set({ locale: "en" })}>
              EN
            </Chip>
            <Chip active={search.locale === "ru"} onClick={() => set({ locale: "ru" })}>
              RU
            </Chip>
          </ChipRow>
        </div>
      </section>

      {q.isPending && !snap ? (
        <div className="rounded-xl bg-surface px-5 py-8 text-sm text-muted shadow-[var(--shadow-border)]">
          {t.loading}
        </div>
      ) : null}
      {q.isError && !snap ? (
        <div className="rounded-xl bg-surface px-5 py-8 text-sm text-break shadow-[var(--shadow-border)]">
          {t.error}
        </div>
      ) : null}

      {snap ? (
        <div className="stagger-in flex flex-col gap-5">
          <Hero snap={snap} headline={headline ?? snap.headline} t={t} />
          <PriorStrip snap={snap} t={t} />
          <MemoryPanel snap={snap} t={t} />
          <TickChart snap={snap} t={t} />
          {snap.neighbors ? <Neighbors snap={snap} t={t} /> : null}
        </div>
      ) : null}

      <footer className="mt-auto flex flex-col gap-3 border-t border-border pt-5 text-sm text-muted">
        <p className="text-pretty">{t.rule}</p>
        <p className="text-pretty">{t.footer}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-2 font-mono text-xs">
          <a className="text-accent underline-offset-4 hover:underline" href={exportHref({ ...search, venue }, "json")}>
            {t.exportJson}
          </a>
          <a className="text-accent underline-offset-4 hover:underline" href={exportHref({ ...search, venue }, "csv")}>
            {t.exportCsv}
          </a>
          <a className="text-accent underline-offset-4 hover:underline" href="/api/export?format=schema">
            {t.schema}
          </a>
        </div>
      </footer>
    </div>
  );
}

function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-xs uppercase tracking-[0.16em] text-subtle">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Hero({
  snap,
  headline,
  t,
}: {
  snap: HandoffSnapshot;
  headline: string;
  t: (typeof labels)[LocaleId];
}) {
  const leanLabel =
    snap.lean === "continue" ? t.continue : snap.lean === "break" ? t.break : t.unclear;
  const phaseLabel =
    snap.sessionPhase === "wait_next"
      ? t.phaseWaitNext
      : snap.sessionPhase === "resolved"
        ? t.phaseResolved
        : snap.sessionPhase === "awaiting"
          ? t.awaiting
          : t.live;
  const chip =
    snap.sessionPhase === "resolved"
      ? t.chipResolved
      : snap.advice === "wait_next_session"
        ? t.chipWaitNext
        : snap.advice === "read_layers"
          ? t.chipRead
          : t.chipWaitOpen;
  return (
    <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-full px-4 py-2 font-mono text-sm font-medium uppercase tracking-[0.14em] ring-1",
            LEAN_TONE[snap.lean],
          )}
        >
          {leanLabel}
        </span>
        <span className="font-mono text-sm text-fg">{junctionArrow(snap.junction)}</span>
        <span className="rounded-full bg-elevated px-3 py-1.5 font-mono text-xs uppercase tracking-[0.12em] text-muted">
          {phaseLabel}
        </span>
        {snap.weekend ? (
          <span className="rounded-full bg-elevated px-3 py-1.5 font-mono text-xs text-muted">
            {t.weekend}
          </span>
        ) : null}
      </div>
      <p className="mt-4 text-lg font-medium leading-snug text-balance sm:text-xl">{headline}</p>
      <p
        className={cn(
          "mt-3 font-mono text-sm",
          snap.sessionPhase === "wait_next" ? "text-unclear" : "text-muted",
        )}
      >
        {chip}
      </p>
    </section>
  );
}

function PriorStrip({ snap, t }: { snap: HandoffSnapshot; t: (typeof labels)[LocaleId] }) {
  const p = snap.prior;
  return (
    <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-mono text-xs uppercase tracking-[0.16em] text-subtle">{t.prior}</h2>
        <span className="font-mono text-xs text-muted">{p?.name ?? "—"}</span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label={t.open} value={fmtPx(p?.open)} />
        <Stat label={t.high} value={fmtPx(p?.high)} />
        <Stat label={t.low} value={fmtPx(p?.low)} />
        <Stat label={t.close} value={`${fmtPx(p?.close)}  ${fmtRet(p?.ret)}`} />
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <MetaChip label={t.stretch} value={snap.stretch ?? "—"} />
        <MetaChip label={t.closeLoc} value={snap.closeLoc ?? "—"} />
        <MetaChip label={t.sweep} value={snap.sweptPrior ?? "—"} />
        {snap.stuck ? <Flag>{t.stuck}</Flag> : null}
        {snap.pressedHigh ? <Flag>{t.pressedHigh}</Flag> : null}
        {snap.pressedLow ? <Flag>{t.pressedLow}</Flag> : null}
      </div>
    </section>
  );
}

function MemoryPanel({ snap, t }: { snap: HandoffSnapshot; t: (typeof labels)[LocaleId] }) {
  const m = snap.memory;
  const bars = [
    { key: t.inside, p: m.pInside, color: "bg-inside" },
    { key: t.brokeHigh, p: m.pBrokeHigh, color: "bg-break" },
    { key: t.brokeLow, p: m.pBrokeLow, color: "bg-continue" },
  ];
  return (
    <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-mono text-xs uppercase tracking-[0.16em] text-subtle">{t.memory}</h2>
        <p className="font-mono text-xs text-muted">
          {t.n}={m.n}
          {m.thin ? " · thin" : ""}
          {m.pBoth != null ? ` · ${t.both} ${pct(m.pBoth)}` : ""}
        </p>
      </div>
      {m.thin ? <p className="mt-3 text-sm text-unclear">{t.thin}</p> : null}
      <ul className="mt-4 flex flex-col gap-3">
        {bars.map((b) => (
          <li key={b.key}>
            <div className="mb-1 flex justify-between font-mono text-xs text-muted">
              <span>{b.key}</span>
              <span className="tabular-nums text-fg">{pct(b.p)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-elevated">
              <div
                className={cn("h-full rounded-full transition-[width] duration-500", b.color)}
                style={{ width: `${Math.max(0, Math.min(100, (b.p ?? 0) * 100))}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TickChart({ snap, t }: { snap: HandoffSnapshot; t: (typeof labels)[LocaleId] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const data = snap.ticks.map((tick, i) => ({
    i: i + 1,
    v: 1,
    mark: tick.mark,
  }));
  return (
    <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
      <div className="flex items-baseline justify-between">
        <h2 className="font-mono text-xs uppercase tracking-[0.16em] text-subtle">{t.ticks}</h2>
        <p className="font-mono text-xs text-muted">C / B / I</p>
      </div>
      <div className="mt-3 h-28">
        {mounted && data.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap={2}>
              <XAxis dataKey="i" hide />
              <YAxis hide domain={[0, 1]} />
              <Bar dataKey="v" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                {data.map((d, idx) => (
                  <Cell key={idx} fill={MARK_COLOR[d.mark]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center text-sm text-muted">
            {data.map((d) => d.mark).join(" ") || "—"}
          </div>
        )}
      </div>
      <div className="mt-2 flex gap-2 overflow-x-auto font-mono text-xs text-muted">
        {snap.ticks.map((tick, i) => (
          <span key={`${tick.t}-${i}`} className="min-w-5 text-center text-fg">
            {tick.mark}
          </span>
        ))}
      </div>
    </section>
  );
}

function Neighbors({ snap, t }: { snap: HandoffSnapshot; t: (typeof labels)[LocaleId] }) {
  const entries = Object.entries(snap.neighbors ?? {}).filter(([, v]) => v);
  if (!entries.length) return null;
  return (
    <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
      <h2 className="font-mono text-xs uppercase tracking-[0.16em] text-subtle">{t.neighbors}</h2>
      <ul className="mt-3 flex flex-col gap-2 text-sm">
        {entries.map(([name, brief]) => (
          <li key={name} className="flex flex-wrap gap-2 text-muted">
            <span className="font-mono uppercase text-fg">{name}</span>
            <span>{brief?.model}</span>
            <span>{brief?.headline ?? brief?.state}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-xs uppercase tracking-[0.14em] text-subtle">{label}</dt>
      <dd className="mt-1 font-mono text-sm tabular-nums text-fg">{value}</dd>
    </div>
  );
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-md bg-elevated px-2.5 py-1.5 font-mono text-xs text-muted">
      {label} {value}
    </span>
  );
}

function Flag({ children }: { children: string }) {
  return (
    <span className="rounded-md bg-accent/10 px-2.5 py-1.5 font-mono text-xs text-accent">
      {children}
    </span>
  );
}

function exportHref(search: Search & { venue: VenueId }, format: "json" | "csv") {
  const q = new URLSearchParams({
    symbol: search.symbol,
    venue: search.venue,
    lookback: String(search.lookback),
    format,
  });
  return `/api/export?${q}`;
}
