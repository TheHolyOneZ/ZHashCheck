// Copyright (c) 2026 TheHolyOneZ

import type { Algo } from "@/bindings/Algo";

const UNITS = ["B", "KB", "MB", "GB", "TB", "PB"];

export function formatBytes(n: number | bigint, decimals = 1): string {
  let v = typeof n === "bigint" ? Number(n) : n;
  if (!Number.isFinite(v) || v < 0) return "—";
  let i = 0;
  while (v >= 1024 && i < UNITS.length - 1) {
    v /= 1024;
    i++;
  }
  const d = i === 0 ? 0 : decimals;
  return `${v.toFixed(d)} ${UNITS[i]}`;
}

export function formatRate(bps: number): string {
  if (!bps || !Number.isFinite(bps)) return "—";
  return `${formatBytes(bps)}/s`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return "—";
  if (seconds < 1) return "<1s";
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return `${m}m ${rs}s`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h}h ${rm}m`;
}

export function truncateHash(hex: string, head = 8, tail = 8): string {
  if (hex.length <= head + tail + 1) return hex;
  return `${hex.slice(0, head)}…${hex.slice(-tail)}`;
}

const ALGO_LABELS: Record<Algo, string> = {
  md5: "MD5",
  sha1: "SHA-1",
  sha224: "SHA-224",
  sha256: "SHA-256",
  sha384: "SHA-384",
  sha512: "SHA-512",
  "sha3-256": "SHA3-256",
  "sha3-512": "SHA3-512",
  blake2b256: "BLAKE2b-256",
  blake2s256: "BLAKE2s-256",
  blake3: "BLAKE3",
  "xxh3-64": "xxh3-64",
  "xxh3-128": "xxh3-128",
  crc32: "CRC32",
};

export function algoLabel(a: Algo): string {
  return ALGO_LABELS[a] ?? String(a);
}


export function isLegacy(a: Algo): boolean {
  return a === "md5" || a === "sha1";
}


export function errMsg(e: unknown): string {
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object") {
    const o = e as { message?: unknown; kind?: unknown };
    if (typeof o.message === "string" && o.message.length > 0) return o.message;
    try {
      return JSON.stringify(e);
    } catch {
      return Object.prototype.toString.call(e);
    }
  }
  return String(e);
}
