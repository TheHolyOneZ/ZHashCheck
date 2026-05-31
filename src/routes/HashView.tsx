// Copyright (c) 2026 TheHolyOneZ

import { useCallback, useMemo, useRef } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { save as saveDialog } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "sonner";
import { FolderOpen, FilePlus, Trash2, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HashCell } from "@/components/HashCell";
import { useJobsStore, type HashRow } from "@/store/jobs";
import { useUiStore } from "@/store/ui";
import { cancelJob, exportResults, hashFiles } from "@/lib/ipc";
import { errMsg, formatBytes, formatDuration } from "@/lib/format";
import { useContextMenu } from "@/hooks/useContextMenu";
import type { Algo } from "@/bindings/Algo";
import type { ExportEntry } from "@/bindings/ExportEntry";

const ALL_ALGOS: Algo[] = [
  "md5", "sha1", "sha224", "sha256", "sha384", "sha512",
  "sha3-256", "sha3-512", "blake2b256", "blake2s256",
  "blake3", "xxh3-64", "xxh3-128", "crc32",
];

export function HashView() {
  const rows = useJobsStore((s) => s.rows);
  const running = useJobsStore((s) => s.running);
  const currentJobId = useJobsStore((s) => s.currentJobId);
  const clearRows = useJobsStore((s) => s.clearRows);
  const reset = useJobsStore((s) => s.reset);
  const setRunning = useJobsStore((s) => s.setRunning);
  const setCurrentJobId = useJobsStore((s) => s.setCurrentJobId);
  const defaultAlgos = useUiStore((s) => s.defaultAlgos);
  const setDefaultAlgos = useUiStore((s) => s.setDefaultAlgos);
  const density = useUiStore((s) => s.density);
  const rowPad = density === "compact" ? "px-4 py-1" : "px-4 py-3";

  const startJob = useCallback(
    async (paths: string[]) => {
      if (!paths.length) return;
      reset();
      clearRows();
      setRunning(true);
      try {
        const id = await hashFiles(paths, defaultAlgos);
        setCurrentJobId(id);
      } catch (e) {
        setRunning(false);
        toast.error(`Failed to start: ${errMsg(e)}`);
      }
    },
    [defaultAlgos, reset, clearRows, setRunning, setCurrentJobId],
  );

  async function pickFiles() {
    const sel = await openDialog({ multiple: true });
    if (!sel) return;
    const paths = Array.isArray(sel) ? sel : [sel];
    await startJob(paths);
  }

  async function pickFolder() {
    const sel = await openDialog({ directory: true });
    if (!sel) return;
    await startJob([sel as string]);
  }

  async function cancel() {
    if (currentJobId) await cancelJob(currentJobId);
  }

  async function doExport() {
    if (!rows.length) return;
    const entries: ExportEntry[] = rows
      .filter((r) => !r.error)
      .map((r) => ({
        path: r.path,
        bytes: r.bytes,
        hashes: r.hashes,
      }));
    if (!entries.length) {
      toast.error("Nothing to export");
      return;
    }
    const text = await exportResults(entries, "sha256sum", "sha256");
    const path = await saveDialog({
      defaultPath: "SHASUMS",
      filters: [{ name: "Checksum file", extensions: ["sha256", "txt"] }],
    });
    if (!path) return;
    await writeTextFile(path, text);
    toast.success(`Exported ${entries.length} entries`);
  }

  const parentRef = useRef<HTMLDivElement>(null);


  const estimateRow = useMemo(() => {
    const header = 38;
    const perHash = 22;
    const vpad = density === "compact" ? 8 : 24;
    return header + defaultAlgos.length * perHash + vpad;
  }, [defaultAlgos.length, density]);


  const VIRT_THRESHOLD = 200;
  const useVirt = rows.length >= VIRT_THRESHOLD;
  const virt = useVirtualizer({
    count: useVirt ? rows.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateRow,
    measureElement: (el) => el.getBoundingClientRect().height,
    overscan: 8,
  });

  const totalBytes = useMemo(
    () => rows.reduce((acc, r) => acc + (r.bytes || 0), 0),
    [rows],
  );

  async function rehash(path: string) {
    useJobsStore.setState((s) => ({ rows: s.rows.filter((x) => x.path !== path) }));
    setRunning(true);
    try {
      const id = await hashFiles([path], defaultAlgos);
      setCurrentJobId(id);
    } catch (e) {
      setRunning(false);
      toast.error(`Failed to re-hash: ${errMsg(e)}`);
    }
  }

  function removeRow(id: string) {
    useJobsStore.setState((s) => ({ rows: s.rows.filter((x) => x.id !== id) }));
  }

  async function copy(text: string, label: string) {
    try {
      await writeText(text);
      toast.success(`${label} copied`);
    } catch (e) {
      toast.error(`Copy failed: ${errMsg(e)}`);
    }
  }

  function buildRowMenu(r: HashRow) {
    const sha256 = r.hashes.sha256;
    const allHashes = (Object.entries(r.hashes) as [Algo, string][])
      .filter(([, hex]) => !!hex)
      .map(([algo, hex]) => `${algo}\t${hex}`)
      .join("\n");
    return [
      { label: "Copy path", onSelect: () => copy(r.path, "Path") },
      ...(sha256
        ? [{ label: "Copy as sha256sum line", onSelect: () => copy(`${sha256}  ${r.path}`, "sha256sum line") }]
        : []),
      { label: "Copy all hashes", disabled: !allHashes, onSelect: () => copy(allHashes, "All hashes") },
      { type: "separator" as const },
      { label: "Re-hash this file", disabled: running, onSelect: () => rehash(r.path) },
      { label: "Remove from list", danger: true, onSelect: () => removeRow(r.id) },
    ];
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <h1 className="text-sm font-semibold">Hash</h1>
        <span className="ml-3 text-xs text-muted-foreground">
          Drop files anywhere, or pick from disk. Every selected algorithm is computed in a single read pass, results stream in live — click any hash to copy it.
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <Button size="sm" variant="ghost" onClick={pickFiles}>
            <FilePlus className="h-4 w-4" /> Add files
          </Button>
          <Button size="sm" variant="ghost" onClick={pickFolder}>
            <FolderOpen className="h-4 w-4" /> Add folder
          </Button>
          {running ? (
            <Button size="sm" variant="danger" onClick={cancel}>
              <X className="h-4 w-4" /> Cancel
            </Button>
          ) : rows.length > 0 ? (
            <>
              <Button size="sm" variant="ghost" onClick={doExport}>
                <Download className="h-4 w-4" /> Export
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { clearRows(); reset(); }}>
                <Trash2 className="h-4 w-4" /> Clear
              </Button>
            </>
          ) : null}
        </div>
      </header>

      <div className="shrink-0 border-b px-4 pt-2 text-[11px] text-muted-foreground">
        Toggle which algorithms to compute. MD5 and SHA-1 are legacy — use SHA-256 or BLAKE3 for new work.
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b px-4 py-2">
        <span className="mr-1 text-[11px] uppercase tracking-wider text-muted-foreground">
          Algorithms
        </span>
        {ALL_ALGOS.map((a) => {
          const on = defaultAlgos.includes(a);
          return (
            <button
              key={a}
              type="button"
              onClick={() => {
                setDefaultAlgos(
                  on ? defaultAlgos.filter((x) => x !== a) : [...defaultAlgos, a],
                );
              }}
              className={
                "rounded-md border px-2 py-0.5 text-[11px] font-medium transition " +
                (on
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground")
              }
            >
              {a}
            </button>
          );
        })}
      </div>

      <div ref={parentRef} className="min-h-0 flex-1 overflow-auto">
        {rows.length === 0 ? (
          <EmptyState />
        ) : useVirt ? (
          <div className="relative" style={{ height: virt.getTotalSize() }}>
            {virt.getVirtualItems().map((vi) => {
              const r = rows[vi.index];
              if (!r) return null;
              return (
                <RowItem
                  key={r.id}
                  r={r}
                  refCb={virt.measureElement}
                  index={vi.index}
                  className={`absolute left-0 right-0 border-b ${rowPad}`}
                  style={{ top: vi.start }}
                  buildMenu={buildRowMenu}
                />
              );
            })}
          </div>
        ) : (

          <div>
            {rows.map((r) => (
              <RowItem
                key={r.id}
                r={r}
                className={`border-b ${rowPad}`}
                buildMenu={buildRowMenu}
              />
            ))}
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <div className="shrink-0 border-t px-4 py-1.5 text-[11px] text-muted-foreground">
          {rows.length} file{rows.length === 1 ? "" : "s"} · {formatBytes(totalBytes)}
        </div>
      )}
    </div>
  );
}

function RowItem({
  r,
  refCb,
  index,
  className,
  style,
  buildMenu,
}: {
  r: HashRow;
  refCb?: (el: HTMLElement | null) => void;
  index?: number;
  className: string;
  style?: React.CSSProperties;
  buildMenu: (r: HashRow) => ReturnType<Parameters<typeof useContextMenu>[0]>;
}) {
  const onContextMenu = useContextMenu(() => buildMenu(r));
  return (
    <div
      ref={refCb}
      data-index={index}
      className={className}
      style={style}
      onContextMenu={onContextMenu}
    >
      <RowBody r={r} />
    </div>
  );
}

function RowBody({ r }: { r: HashRow }) {
  return (
    <>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate font-mono text-[12px] text-foreground" title={r.path}>
            {r.path}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {formatBytes(r.bytes)} · {formatDuration(r.tookMs / 1000)}
          </div>
        </div>
      </div>
      {r.error ? (
        <div className="mt-1 text-[12px] text-rose-500">{r.error}</div>
      ) : (
        <div className="mt-1 flex flex-col gap-0.5">
          {(Object.entries(r.hashes) as [Algo, string][]).map(([algo, hex]) => (
            <HashCell key={algo} algo={algo} hex={hex} />
          ))}
        </div>
      )}
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-10 text-center">
      <div className="text-sm text-foreground">Drop files anywhere to hash them.</div>
      <div className="max-w-md text-xs text-muted-foreground">
        Each file is read once and every algorithm enabled above is computed in parallel — rows appear as they finish, even on huge folders.
      </div>
      <div className="text-xs text-muted-foreground">
        Or press <kbd className="rounded border px-1">⌘O</kbd> to pick files,{" "}
        <kbd className="rounded border px-1">⌘⇧O</kbd> for a folder.
      </div>
    </div>
  );
}
