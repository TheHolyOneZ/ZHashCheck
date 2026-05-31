// Copyright (c) 2026 TheHolyOneZ

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HashCell } from "@/components/HashCell";
import { clearHistory, getHistory, hashFiles } from "@/lib/ipc";
import { errMsg, formatBytes } from "@/lib/format";
import { useContextMenu } from "@/hooks/useContextMenu";
import { useUiStore } from "@/store/ui";
import { useJobsStore } from "@/store/jobs";
import type { HistoryEntry } from "@/bindings/HistoryEntry";
import type { Algo } from "@/bindings/Algo";

export function HistoryView() {
  const density = useUiStore((s) => s.density);
  const rowPad = density === "compact" ? "px-4 py-1" : "px-4 py-3";
  const defaultAlgos = useUiStore((s) => s.defaultAlgos);
  const setRunning = useJobsStore((s) => s.setRunning);
  const setCurrentJobId = useJobsStore((s) => s.setCurrentJobId);
  const reset = useJobsStore((s) => s.reset);
  const clearRows = useJobsStore((s) => s.clearRows);
  const setView = useUiStore((s) => s.setView);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    try {
      const r = await getHistory(500, 0);
      setEntries(r);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function copy(text: string, label: string) {
    try {
      await writeText(text);
      toast.success(`${label} copied`);
    } catch (e) {
      toast.error(`Copy failed: ${errMsg(e)}`);
    }
  }

  async function rehash(path: string) {
    reset();
    clearRows();
    setRunning(true);
    setView("hash");
    try {
      const id = await hashFiles([path], defaultAlgos);
      setCurrentJobId(id);
    } catch (e) {
      setRunning(false);
      toast.error(`Failed to re-hash: ${errMsg(e)}`);
    }
  }

  function buildRowMenu(e: HistoryEntry) {
    const sha256 = e.hashes.sha256;
    const allHashes = (Object.entries(e.hashes) as [Algo, string][])
      .filter(([, hex]) => !!hex)
      .map(([algo, hex]) => `${algo}\t${hex}`)
      .join("\n");
    return [
      { label: "Copy path", onSelect: () => copy(e.path, "Path") },
      ...(sha256
        ? [{ label: "Copy as sha256sum line", onSelect: () => copy(`${sha256}  ${e.path}`, "sha256sum line") }]
        : []),
      { label: "Copy all hashes", disabled: !allHashes, onSelect: () => copy(allHashes, "All hashes") },
      { type: "separator" as const },
      { label: "Re-hash this file", onSelect: () => rehash(e.path) },
    ];
  }

  async function purge() {
    if (!entries.length) return;
    try {
      await clearHistory();
      setEntries([]);
      toast.success("History cleared");
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  const f = filter.trim().toLowerCase();
  const shown = f
    ? entries.filter((e) =>
        e.path.toLowerCase().includes(f) ||
        Object.values(e.hashes).some((h) => h?.toLowerCase().includes(f)),
      )
    : entries;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <h1 className="text-sm font-semibold">History</h1>
        <span className="ml-3 text-xs text-muted-foreground">
          Everything you've hashed is saved locally in SQLite so you can find a hash you computed weeks ago. Nothing is ever sent anywhere.
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <Button size="sm" variant="ghost" onClick={load} disabled={busy}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" variant="danger" onClick={purge} disabled={!entries.length}>
            <Trash2 className="h-4 w-4" /> Clear
          </Button>
        </div>
      </header>

      <div className="shrink-0 border-b px-4 py-2">
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by path or hash…"
          className="font-mono text-xs"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {shown.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 px-6 text-center text-xs text-muted-foreground">
            {busy ? (
              "Loading…"
            ) : entries.length ? (
              "No matches."
            ) : (
              <>
                <span>No history yet.</span>
                <span className="max-w-md">
                  Entries appear here automatically every time you hash a file in the Hash tab.
                </span>
              </>
            )}
          </div>
        ) : (
          <div>
            {shown.map((e) => (
              <HistoryRow
                key={String(e.id)}
                e={e}
                className={`border-b ${rowPad}`}
                buildMenu={buildRowMenu}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryRow({
  e,
  className,
  buildMenu,
}: {
  e: HistoryEntry;
  className: string;
  buildMenu: (e: HistoryEntry) => ReturnType<Parameters<typeof useContextMenu>[0]>;
}) {
  const onContextMenu = useContextMenu(() => buildMenu(e));
  return (
    <div className={className} onContextMenu={onContextMenu}>
      <div className="truncate font-mono text-[12px]" title={e.path}>{e.path}</div>
      <div className="text-[10px] text-muted-foreground">
        {formatBytes(Number(e.bytes))} · {new Date(Number(e.createdAt) * 1000).toLocaleString()}
      </div>
      <div className="mt-1 flex flex-col gap-0.5">
        {(Object.entries(e.hashes) as [Algo, string][])
          .filter(([, hex]) => !!hex)
          .map(([algo, hex]) => (
            <HashCell key={algo} algo={algo} hex={hex} />
          ))}
      </div>
    </div>
  );
}
