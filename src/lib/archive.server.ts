import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { ArchiveRow, RawSession } from "@/handoff/types";

const FILE = join(process.cwd(), ".data", "handoff-archive.json");

type DiskArchive = {
  version: "1.1";
  savedAt: number;
  sessions: Record<string, RawSession[]>;
  rows: Record<string, ArchiveRow[]>;
  source: Record<string, string>;
};

const mem: DiskArchive = {
  version: "1.1",
  savedAt: 0,
  sessions: {},
  rows: {},
  source: {},
};

let loaded = false;
let loadPromise: Promise<void> | null = null;

function keyOf(symbol: string, venue: string) {
  return `${symbol}|${venue}`;
}

async function readDisk(): Promise<DiskArchive | null> {
  try {
    const raw = await readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as DiskArchive;
    if (parsed?.version !== "1.1" || !parsed.rows) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeDisk(data: DiskArchive) {
  try {
    await mkdir(dirname(FILE), { recursive: true });
    await writeFile(FILE, JSON.stringify(data), "utf8");
  } catch {
    // Vercel / read-only hosts: keep memory only.
  }
}

export async function loadArchiveStore(): Promise<void> {
  if (loaded) return;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const disk = await readDisk();
    if (disk) {
      mem.savedAt = disk.savedAt;
      mem.sessions = disk.sessions ?? {};
      mem.rows = disk.rows ?? {};
      mem.source = disk.source ?? {};
    }
    loaded = true;
  })();
  return loadPromise;
}

export async function getStoredSessions(symbol: string, venue: string): Promise<RawSession[] | null> {
  await loadArchiveStore();
  return mem.sessions[keyOf(symbol, venue)] ?? null;
}

export async function putArchive(args: {
  symbol: string;
  venue: string;
  sessions: RawSession[];
  rows: ArchiveRow[];
  source: string;
}) {
  await loadArchiveStore();
  const k = keyOf(args.symbol, args.venue);
  mem.sessions[k] = args.sessions;
  mem.rows[k] = args.rows.slice(-800);
  mem.source[k] = args.source;
  mem.savedAt = Date.now();
  await writeDisk(mem);
}

export async function getStoredRows(symbol: string, venue: string): Promise<ArchiveRow[] | null> {
  await loadArchiveStore();
  return mem.rows[keyOf(symbol, venue)] ?? null;
}
