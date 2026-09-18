import { junctionArrow, type Junction } from "./sessionClock.ts";
import { pct } from "./math.ts";
import type { Lean, MemoryCard } from "./types.ts";

const TOP_LABEL: Record<string, { en: string; ru: string }> = {
  inside: { en: "inside", ru: "inside" },
  brokeHigh: { en: "brokeHigh", ru: "brokeHigh" },
  brokeLow: { en: "brokeLow", ru: "brokeLow" },
};

export function topFrequency(memory: Pick<MemoryCard, "pInside" | "pBrokeHigh" | "pBrokeLow">): {
  key: "inside" | "brokeHigh" | "brokeLow";
  p: number | null;
} {
  const items: Array<{ key: "inside" | "brokeHigh" | "brokeLow"; p: number | null }> = [
    { key: "inside", p: memory.pInside },
    { key: "brokeHigh", p: memory.pBrokeHigh },
    { key: "brokeLow", p: memory.pBrokeLow },
  ];
  items.sort((a, b) => (b.p ?? -1) - (a.p ?? -1));
  return items[0]!;
}

export function makeHeadlines(args: {
  lean: Lean;
  junction: Junction;
  stuck: boolean;
  memory: MemoryCard;
}): { headline: string; headlineRu: string } {
  const j = junctionArrow(args.junction);
  const n = args.memory.n;
  if (args.memory.thin || n < 40) {
    return {
      headline: `Wait · ${j} · thin sample n=${n}`,
      headlineRu: `Ждать · ${j} · тонкая выборка n=${n}`,
    };
  }
  const top = topFrequency(args.memory);
  const topPct = pct(top.p);
  const topEn = TOP_LABEL[top.key]?.en ?? top.key;
  const cont = pct(args.memory.pContinue);

  if (args.lean === "unclear" && args.stuck) {
    return {
      headline: `Wait · ${j} · stuck at range · inside ${pct(args.memory.pInside)} · n=${n}`,
      headlineRu: `Ждать · ${j} · stuck у диапазона · inside ${pct(args.memory.pInside)} · n=${n}`,
    };
  }
  if (args.lean === "break") {
    return {
      headline: `Break lean · ${j} · hist continue ${cont} · ${topEn} ${topPct} · n=${n}`,
      headlineRu: `Наклон break · ${j} · hist continue ${cont} · ${topEn} ${topPct} · n=${n}`,
    };
  }
  if (args.lean === "continue") {
    return {
      headline: `Continue lean · ${j} · hist continue ${cont} · ${topEn} ${topPct} · n=${n}`,
      headlineRu: `Наклон continue · ${j} · hist continue ${cont} · ${topEn} ${topPct} · n=${n}`,
    };
  }
  return {
    headline: `Wait · ${j} · ${topEn} ${topPct} · n=${n}`,
    headlineRu: `Ждать · ${j} · ${topEn} ${topPct} · n=${n}`,
  };
}

export const FORBIDDEN_COPY = [
  /\bbuy\b/i,
  /\bsell\b/i,
  /\blong\b/i,
  /\bshort\b/i,
  /купить/i,
  /продать/i,
  /покупай/i,
  /продавай/i,
];

export function headlineHasOrderCopy(text: string): boolean {
  return FORBIDDEN_COPY.some((re) => re.test(text));
}
