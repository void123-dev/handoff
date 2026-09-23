/** Persist wait_next fingerprints and send one Telegram INFO. Fail-soft if the bot is unset. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { junctionArrow, sessionDateKey } from "@/handoff/sessionClock";
import type { Phase } from "@/handoff/phase";
import { shouldEmitWaitNext, waitNextFingerprint, waitNextTelegram } from "@/handoff/watch";
import { env } from "@/lib/env.server";

const FILE = join(process.cwd(), ".data", "handoff-watch.json");

type WatchStore = {
  sent: string[];
  phase: Record<string, Phase>;
};

const mem: WatchStore = { sent: [], phase: {} };
let loaded = false;

async function load() {
  if (loaded) return;
  try {
    const raw = await readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as WatchStore;
    mem.sent = Array.isArray(parsed.sent) ? parsed.sent : [];
    mem.phase = parsed.phase ?? {};
  } catch {
    // first run or read-only host
  }
  loaded = true;
}

async function save() {
  try {
    await mkdir(dirname(FILE), { recursive: true });
    await writeFile(FILE, JSON.stringify(mem), "utf8");
  } catch {
    // memory still holds the cooldown
  }
}

async function sendTelegram(text: string): Promise<boolean> {
  const token = env("TELEGRAM_BOT_TOKEN");
  const chat = env("TELEGRAM_CHAT_ID");
  if (!token || !chat) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chat,
        text,
        disable_web_page_preview: true,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function noteWaitNext(args: {
  symbol: string;
  junction: "ny_to_asia" | "asia_to_london" | "london_to_ny";
  to: "asia" | "london" | "ny";
  phase: Phase;
  source: "live" | "demo";
  now: number;
}): Promise<{ emitted: boolean; fingerprint: string }> {
  const sessionDate = sessionDateKey(args.now, args.to);
  const fingerprint = waitNextFingerprint(args.symbol, args.junction, sessionDate);
  const key = `${args.symbol}|${args.junction}|${sessionDate}`;
  await load();
  const prev = mem.phase[key] ?? null;
  const sent = mem.sent.includes(fingerprint);
  const emit = args.source === "live" && shouldEmitWaitNext(prev, args.phase, sent);
  mem.phase[key] = args.phase;
  if (emit) {
    const text = waitNextTelegram(args.symbol, junctionArrow(args.junction));
    await sendTelegram(text);
    mem.sent.push(fingerprint);
    if (mem.sent.length > 400) mem.sent.splice(0, mem.sent.length - 400);
  }
  await save();
  return { emitted: emit, fingerprint };
}
