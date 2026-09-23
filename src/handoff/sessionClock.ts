/** America/New_York session clock. Asia 19–03, London 03–08, NY 08–16, gap 16–19. */
export type Junction = "ny_to_asia" | "asia_to_london" | "london_to_ny";
export type SessionName = "asia" | "london" | "ny";

export type EtCalendar = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: string;
  weekend: boolean;
};

export function etParts(ms: number) {
  const cal = etCalendar(ms);
  return { weekday: cal.weekday, hour: cal.hour, weekend: cal.weekend };
}

export function etCalendar(ms: number): EtCalendar {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(new Date(ms));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = get("weekday");
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    weekday,
    weekend: weekday === "Sat" || weekday === "Sun",
  };
}

/** UTC millis for a wall-clock instant in America/New_York. */
export function etWallToUtc(year: number, month: number, day: number, hour: number, minute = 0): number {
  let utc = Date.UTC(year, month - 1, day, hour + 5, minute);
  const want = Date.UTC(year, month - 1, day, hour, minute);
  for (let i = 0; i < 4; i++) {
    const got = etCalendar(utc);
    const gotUtc = Date.UTC(got.year, got.month - 1, got.day, got.hour, got.minute);
    const delta = want - gotUtc;
    if (delta === 0) break;
    utc += delta;
  }
  return utc;
}

export function activeJunction(ms: number) {
  const { hour } = etParts(ms);
  if (hour >= 16 && hour < 19) {
    return {
      junction: "ny_to_asia" as const,
      from: "ny" as const,
      to: "asia" as const,
      awaiting: true,
    };
  }
  if (hour >= 19 || hour < 3) {
    return {
      junction: "ny_to_asia" as const,
      from: "ny" as const,
      to: "asia" as const,
      awaiting: hour >= 19 && hour < 21,
    };
  }
  if (hour >= 3 && hour < 8) {
    return {
      junction: "asia_to_london" as const,
      from: "asia" as const,
      to: "london" as const,
      awaiting: hour < 4,
    };
  }
  return {
    junction: "london_to_ny" as const,
    from: "london" as const,
    to: "ny" as const,
    awaiting: hour < 10,
  };
}

/** wait_next cannot fire before this hour. Opening can still print. */
export function waitNextEligible(ms: number, junction: Junction = activeJunction(ms).junction): boolean {
  const { hour } = etParts(ms);
  if (junction === "ny_to_asia") return hour >= 21 || hour < 3;
  if (junction === "asia_to_london") return hour >= 5 && hour < 8;
  return hour >= 10 && hour < 16;
}

export function sessionOpenMs(now: number, to: SessionName): number {
  const cal = etCalendar(now);
  if (to === "london") return etWallToUtc(cal.year, cal.month, cal.day, 3);
  if (to === "ny") return etWallToUtc(cal.year, cal.month, cal.day, 8);
  if (cal.hour >= 19) return etWallToUtc(cal.year, cal.month, cal.day, 19);
  if (cal.hour < 3) {
    const noon = etWallToUtc(cal.year, cal.month, cal.day, 12);
    const prev = etCalendar(noon - 24 * 60 * 60 * 1000);
    return etWallToUtc(prev.year, prev.month, prev.day, 19);
  }
  return etWallToUtc(cal.year, cal.month, cal.day, 19);
}

export function sessionEndMs(open: number, to: SessionName): number {
  if (to === "london") return open + 5 * 60 * 60 * 1000;
  return open + 8 * 60 * 60 * 1000;
}

export function sessionDateKey(now: number, to: SessionName): string {
  const cal = etCalendar(sessionOpenMs(now, to));
  const month = String(cal.month).padStart(2, "0");
  const day = String(cal.day).padStart(2, "0");
  return `${cal.year}-${month}-${day}`;
}

export function sessionNameAt(ms: number): SessionName | null {
  const { hour } = etParts(ms);
  if (hour >= 19 || hour < 3) return "asia";
  if (hour >= 3 && hour < 8) return "london";
  if (hour >= 8 && hour < 16) return "ny";
  return null;
}

export function junctionOf(from: SessionName, to: SessionName): Junction | null {
  if (from === "ny" && to === "asia") return "ny_to_asia";
  if (from === "asia" && to === "london") return "asia_to_london";
  if (from === "london" && to === "ny") return "london_to_ny";
  return null;
}

export function junctionArrow(junction: Junction): string {
  if (junction === "ny_to_asia") return "ny→asia";
  if (junction === "asia_to_london") return "asia→london";
  return "london→ny";
}

export function sessionLabel(name: SessionName): string {
  if (name === "ny") return "NY";
  if (name === "london") return "London";
  return "Asia";
}
