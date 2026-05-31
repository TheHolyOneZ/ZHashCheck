// Copyright (c) 2026 TheHolyOneZ

import { useEffect, useMemo, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { toast } from "sonner";
import { Copy as CopyIcon, Trash2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { findDuplicates, moveToTrash, onDedupReport, onJobError } from "@/lib/ipc";
import { errMsg, formatBytes, truncateHash } from "@/lib/format";
import { useContextMenu } from "@/hooks/useContextMenu";
import { useUiStore } from "@/store/ui";
import type { DedupReport } from "@/bindings/DedupReport";
import type { DuplicateGroup } from "@/bindings/DuplicateGroup";
import type { DuplicateFile } from "@/bindings/DuplicateFile";

export function DuplicatesView() {
  const density = useUiStore((s) => s.density);
  const rowPad = density === "compact" ? "px-3 py-1" : "px-3 py-1.5";
  const [roots, setRoots] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<DedupReport | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsubs: Array<Promise<() => void>> = [];
    unsubs.push(onDedupReport((_id, r) => {
      setReport(r);
      setBusy(false);
    }));


    unsubs.push(onJobError((e) => {
      if (e.path) return;
      setBusy(false);
      toast.error(e.message);
    }));
    return () => { unsubs.forEach((p) => p.then((un) => un()).catch(() => {})); };
  }, []);

  async function addRoot() {
    const p = await openDialog({ directory: true });
    if (typeof p === "string" && !roots.includes(p)) {
      setRoots([...roots, p]);
    }
  }

  async function run() {
    if (!roots.length) {
      toast.error("Pick at least one folder.");
      return;
    }
    setBusy(true);
    setReport(null);
    setSelected(new Set());
    try {
      await findDuplicates(roots, null);
    } catch (e) {
      setBusy(false);
      toast.error(errMsg(e));
    }
  }

  function toggle(path: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function selectAllButFirstPerGroup() {
    if (!report) return;
    const s = new Set<string>();
    for (const g of report.groups) {
      g.files.slice(1).forEach((f) => s.add(f.path));
    }
    setSelected(s);
  }

  async function trashSelected() {
    if (!selected.size) return;
    const paths = Array.from(selected);
    try {
      const r = await moveToTrash(paths);
      toast.success(`Sent ${r.trashed} to trash${r.failed ? ` · ${r.failed} failed` : ""}`);

      if (report) {
        const trashedOk = new Set(r.items.filter((i) => i.ok).map((i) => i.path));
        setReport({
          ...report,
          groups: report.groups
            .map((g) => ({ ...g, files: g.files.filter((f) => !trashedOk.has(f.path)) }))
            .filter((g) => g.files.length > 1),
        });
        setSelected(new Set());
      }
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  const totalWasted = useMemo(() => report ? Number(report.totalWastedBytes) : 0, [report]);

  async function copy(text: string, label: string) {
    try {
      await writeText(text);
      toast.success(`${label} copied`);
    } catch (e) {
      toast.error(`Copy failed: ${errMsg(e)}`);
    }
  }

  async function trashOne(path: string) {
    try {
      const r = await moveToTrash([path]);
      toast.success(`Sent ${r.trashed} to trash${r.failed ? ` · ${r.failed} failed` : ""}`);
      if (report) {
        const ok = new Set(r.items.filter((i) => i.ok).map((i) => i.path));
        setReport({
          ...report,
          groups: report.groups
            .map((g) => ({ ...g, files: g.files.filter((f) => !ok.has(f.path)) }))
            .filter((g) => g.files.length > 1),
        });
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(path);
          return next;
        });
      }
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  function buildFileMenu(g: DuplicateGroup, f: DuplicateFile) {
    const isSelected = selected.has(f.path);
    const others = g.files.filter((x) => x.path !== f.path).map((x) => x.path);
    return [
      { label: "Copy path", onSelect: () => copy(f.path, "Path") },
      { label: "Copy hash", onSelect: () => copy(g.hash, "Hash") },
      { type: "separator" as const },
      {
        label: isSelected ? "Deselect" : "Select for trash",
        onSelect: () => toggle(f.path),
      },
      {
        label: "Select all others in group",
        disabled: !others.length,
        onSelect: () => {
          setSelected((prev) => {
            const next = new Set(prev);
            others.forEach((p) => next.add(p));
            return next;
          });
        },
      },
      { type: "separator" as const },
      { label: "Send to trash", danger: true, onSelect: () => trashOne(f.path) },
    ];
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <h1 className="text-sm font-semibold">Duplicates</h1>
        <span className="ml-3 text-xs text-muted-foreground">
          Find identical files across folders, then bulk-trash the extras.
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {selected.size > 0 && (
            <Button size="sm" variant="danger" onClick={trashSelected}>
              <Trash2 className="h-4 w-4" /> Trash {selected.size}
            </Button>
          )}
        </div>
      </header>

      <div className="shrink-0 border-b px-4 py-2 text-[11px] text-muted-foreground">
        Files are grouped by size first, then a fast quick-check (xxh3) splits unlikely matches, and only the survivors get a full BLAKE3 hash. Selected files go to the OS trash — never permanently deleted.
      </div>

      <div className="space-y-4 overflow-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Folders to scan</CardTitle>
            <p className="text-[11px] text-muted-foreground">
              Pick one or more folders to dedupe across. Subfolders are included.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-1">
              {roots.map((r) => (
                <div key={r} className="flex items-center gap-2 rounded-md border px-2 py-1 text-xs">
                  <span className="flex-1 truncate font-mono" title={r}>{r}</span>
                  <button
                    onClick={() => setRoots(roots.filter((x) => x !== r))}
                    className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                    aria-label="Remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={addRoot}>
                <Plus className="h-4 w-4" /> Add folder
              </Button>
              <Button size="sm" onClick={run} disabled={busy}>
                <CopyIcon className="h-4 w-4" /> {busy ? "Scanning…" : "Find duplicates"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {report && (
          <Card>
            <CardHeader>
              <CardTitle>
                {report.groups.length} group{report.groups.length === 1 ? "" : "s"} · {formatBytes(totalWasted)} reclaimable
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Button size="sm" variant="outline" onClick={selectAllButFirstPerGroup}>
                  Select all but first per group
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  Keeps the first file in each group and selects the rest for trashing.
                </p>
              </div>
              <div className="space-y-3">
                {report.groups.map((g) => (
                  <div key={g.hash} className="rounded-md border">
                    <div className="flex items-center gap-2 border-b px-3 py-1.5 text-[11px] text-muted-foreground">
                      <code className="font-mono">{truncateHash(g.hash)}</code>
                      <span>· {g.files.length} files · {formatBytes(Number(g.sizeEach))} each · {formatBytes(Number(g.wastedBytes))} wasted</span>
                    </div>
                    {g.files.map((f) => (
                      <DupRow
                        key={f.path}
                        g={g}
                        f={f}
                        selected={selected.has(f.path)}
                        onToggle={() => toggle(f.path)}
                        className={`flex cursor-pointer items-center gap-2 border-b text-[12px] last:border-0 hover:bg-accent/30 ${rowPad}`}
                        buildMenu={buildFileMenu}
                      />
                    ))}
                  </div>
                ))}
                {!report.groups.length && (
                  <div className="rounded-md border p-6 text-center text-xs text-muted-foreground">
                    No duplicates found in {Number(report.totalFilesScanned).toLocaleString()} files.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function DupRow({
  g,
  f,
  selected,
  onToggle,
  className,
  buildMenu,
}: {
  g: DuplicateGroup;
  f: DuplicateFile;
  selected: boolean;
  onToggle: () => void;
  className: string;
  buildMenu: (g: DuplicateGroup, f: DuplicateFile) => ReturnType<Parameters<typeof useContextMenu>[0]>;
}) {
  const onContextMenu = useContextMenu(() => buildMenu(g, f));
  return (
    <label className={className} onContextMenu={onContextMenu}>
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="accent-primary"
      />
      <span className="flex-1 truncate font-mono" title={f.path}>{f.path}</span>
      <span className="text-[10px] text-muted-foreground">{formatBytes(Number(f.size))}</span>
    </label>
  );
}
