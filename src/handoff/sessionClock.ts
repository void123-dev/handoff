/** America/New_York session clock. Asia 19–03, London 03–08, NY 08–16, wait 16–19. */
export type Junction = "ny_to_asia" | "asia_to_london" | "london_to_ny";
export type SessionName = "asia" | "london" | "ny";

export function etParts(ms: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date(ms));
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  return { weekday, hour, weekend: weekday === "Sat" || weekday === "Sun" };
}

export function activeJunction(ms: number) {
  const { hour } = etParts(ms);
  if (hour >= 16 && hour < 19)
    return {
      junction: "ny_to_asia" as const,
      from: "ny" as const,
      to: "asia" as const,
      awaiting: true,
    };
  if (hour >= 19 || hour < 3)
    return {
      junction: "ny_to_asia" as const,
      from: "ny" as const,
      to: "asia" as const,
      awaiting: false,
    };
  if (hour >= 3 && hour < 8)
    return {
      junction: "asia_to_london" as const,
      from: "asia" as const,
      to: "london" as const,
      awaiting: hour < 4,
    };
  return {
    junction: "london_to_ny" as const,
    from: "london" as const,
    to: "ny" as const,
    awaiting: hour < 10,
  };
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
