// Copyright (c) 2026 TheHolyOneZ


import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { Algo } from "@/bindings/Algo";
import type { JobProgress } from "@/bindings/JobProgress";
import type { JobError } from "@/bindings/JobError";
import type { PasteVerify } from "@/bindings/PasteVerify";
import type { ChecksumFileReport } from "@/bindings/ChecksumFileReport";
import type { CompareOpts } from "@/bindings/CompareOpts";
import type { CompareReport } from "@/bindings/CompareReport";
import type { DedupOpts } from "@/bindings/DedupOpts";
import type { DedupReport } from "@/bindings/DedupReport";
import type { TrashReport } from "@/bindings/TrashReport";
import type { ExportEntry } from "@/bindings/ExportEntry";
import type { ExportFormat } from "@/bindings/ExportFormat";
import type { Settings } from "@/bindings/Settings";
import type { HistoryEntry } from "@/bindings/HistoryEntry";
import type { QaWorkspace } from "@/bindings/QaWorkspace";

export async function hashFiles(paths: string[], algos: Algo[]): Promise<string> {
  return invoke<string>("hash_files", { paths, algos });
}

export async function hashText(text: string, algos: Algo[]): Promise<Record<Algo, string>> {
  return invoke("hash_text", { text, algos });
}

export async function cancelJob(id: string): Promise<void> {
  return invoke("cancel_job", { id });
}

export async function verifyPaste(path: string, hash: string, algo: Algo | null): Promise<PasteVerify> {
  return invoke("verify_paste", { path, hash, algo });
}

export async function verifyChecksumFile(
  checksumPath: string,
  rootDir: string | null = null,
): Promise<ChecksumFileReport> {
  return invoke("verify_checksum_file", { checksumPath, rootDir });
}

export async function compareFolders(a: string, b: string, opts?: CompareOpts | null): Promise<string> {
  return invoke<string>("compare_folders", { a, b, opts: opts ?? null });
}

export async function findDuplicates(roots: string[], opts?: DedupOpts | null): Promise<string> {
  return invoke<string>("find_duplicates", { roots, opts: opts ?? null });
}

export async function moveToTrash(paths: string[]): Promise<TrashReport> {
  return invoke("move_to_trash", { paths });
}

export async function exportResults(
  entries: ExportEntry[],
  format: ExportFormat,
  algo: Algo | null = null,
): Promise<string> {
  return invoke("export_results", { entries, format, algo });
}

export async function getSettings(): Promise<Settings> {
  return invoke("get_settings");
}
export async function setSettings(settings: Settings): Promise<void> {
  return invoke("set_settings", { settings });
}
export async function getHistory(limit = 200, offset = 0): Promise<HistoryEntry[]> {
  return invoke("get_history", { limit, offset });
}
export async function clearHistory(): Promise<void> {
  return invoke("clear_history");
}

export async function qaSetup(): Promise<QaWorkspace> {
  return invoke("qa_setup");
}
export async function qaCleanup(dir: string): Promise<void> {
  return invoke("qa_cleanup", { dir });
}


export interface JobFileDone {
  id: string;
  path: string;
  hashes: Record<Algo, string>;
  bytes: number;
  tookMs: number;
}

export interface JobDoneEvent {
  id: string;
  filesDone: number;
  bytesDone: number;
  tookMs: number;
}

export function onJobProgress(cb: (p: JobProgress) => void): Promise<UnlistenFn> {
  return listen<JobProgress>("job:progress", (e) => cb(e.payload));
}
export function onJobFileDone(cb: (e: JobFileDone) => void): Promise<UnlistenFn> {
  return listen<JobFileDone>("job:file_done", (e) => cb(e.payload));
}
export function onJobError(cb: (e: JobError) => void): Promise<UnlistenFn> {
  return listen<JobError>("job:error", (e) => cb(e.payload));
}
export function onJobDone(cb: (e: JobDoneEvent) => void): Promise<UnlistenFn> {
  return listen<JobDoneEvent>("job:done", (e) => cb(e.payload));
}

export function onCompareReport(cb: (id: string, r: CompareReport) => void): Promise<UnlistenFn> {
  return listen<{ id: string; report: CompareReport }>("compare:report", (e) =>
    cb(e.payload.id, e.payload.report),
  );
}
export function onDedupReport(cb: (id: string, r: DedupReport) => void): Promise<UnlistenFn> {
  return listen<{ id: string; report: DedupReport }>("dedup:report", (e) =>
    cb(e.payload.id, e.payload.report),
  );
}

export async function openExternal(url: string): Promise<void> {
  return invoke("open_external", { url });
}
