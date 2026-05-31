// Copyright (c) 2026 TheHolyOneZ

import { useEffect, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { toast } from "sonner";
import { FolderOpen, GitCompareArrows } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { compareFolders, onCompareReport, onJobError } from "@/lib/ipc";
import { errMsg, formatBytes } from "@/lib/format";
import { useContextMenu } from "@/hooks/useContextMenu";
import { useUiStore } from "@/store/ui";
import type { CompareReport } from "@/bindings/CompareReport";

type Bucket = "identical" | "differ" | "sizeDiffer" | "onlyA" | "onlyB";

export function CompareView() {
  const density = useUiStore((s) => s.density);
  const rowPad = density === "compact" ? "px-2 py-1" : "px-2 py-1.5";
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<CompareReport | null>(null);
  const [bucket, setBucket] = useState<Bucket>("differ");

  useEffect(() => {
    const unsubs: Array<Promise<() => void>> = [];
    unsubs.push(onCompareReport((_id, r) => {
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

  async function pickA() {
    const p = await openDialog({ directory: true });
    if (typeof p === "string") setA(p);
  }
  async function pickB() {
    const p = await openDialog({ directory: true });
    if (typeof p === "string") setB(p);
  }

  async function run() {
    if (!a || !b) {
      toast.error("Pick two folders to compare.");
      return;
    }
    setBusy(true);
    setReport(null);
    try {
      await compareFolders(a, b, null);
    } catch (e) {
      setBusy(false);
      toast.error(errMsg(e));
    }
  }

  const counts = report ? {
    identical: report.identical.length,
    differ: report.differ.length,
    sizeDiffer: report.sizeDiffer.length,
    onlyA: report.onlyA.length,
    onlyB: report.onlyB.length,
  } : null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <h1 className="text-sm font-semibold">Compare folders</h1>
        <span className="ml-3 text-xs text-muted-foreground">
          Diff two trees by content hash, not by name — catches renames, partial copies, and silent corruption.
        </span>
      </header>

      <div className="space-y-4 overflow-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Folders</CardTitle>
            <p className="text-[11px] text-muted-foreground">
              We hash every file in both trees and group results into five buckets. Files whose sizes already differ are flagged without being re-read.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Input value={a} onChange={(e) => setA(e.target.value)} placeholder="Folder A" className="font-mono text-xs" />
              <Button variant="outline" size="sm" onClick={pickA}><FolderOpen className="h-4 w-4" /></Button>
            </div>
            <div className="flex gap-2">
              <Input value={b} onChange={(e) => setB(e.target.value)} placeholder="Folder B" className="font-mono text-xs" />
              <Button variant="outline" size="sm" onClick={pickB}><FolderOpen className="h-4 w-4" /></Button>
            </div>
            <Button size="sm" onClick={run} disabled={busy}>
              <GitCompareArrows className="h-4 w-4" /> {busy ? "Comparing…" : "Compare"}
            </Button>
          </CardContent>
        </Card>

        {report && counts && (
          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                <Tab on={bucket === "differ"}      onClick={() => setBucket("differ")}      label="Differ"      count={counts.differ}     tone="rose" />
                <Tab on={bucket === "sizeDiffer"}  onClick={() => setBucket("sizeDiffer")}  label="Size differ" count={counts.sizeDiffer} tone="rose" />
                <Tab on={bucket === "onlyA"}       onClick={() => setBucket("onlyA")}       label="Only in A"   count={counts.onlyA}      tone="amber" />
                <Tab on={bucket === "onlyB"}       onClick={() => setBucket("onlyB")}       label="Only in B"   count={counts.onlyB}      tone="amber" />
                <Tab on={bucket === "identical"}   onClick={() => setBucket("identical")}   label="Identical"   count={counts.identical}  tone="emerald" />
              </div>
              <div className="mt-3 max-h-[60vh] overflow-auto rounded-md border">
                {renderBucket(report, bucket, rowPad, a, b)}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Tab({ on, onClick, label, count, tone }: {
  on: boolean; onClick: () => void; label: string; count: number;
  tone: "emerald" | "rose" | "amber";
}) {
  const toneCls = {
    emerald: "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10",
    rose: "text-rose-700 dark:text-rose-300 bg-rose-500/10",
    amber: "text-amber-700 dark:text-amber-300 bg-amber-500/10",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition " +
        (on ? `${toneCls} ring-1 ring-inset ring-current` : "text-muted-foreground hover:text-foreground")
      }
    >
      {label}
      <span className="rounded bg-background/50 px-1 text-[10px]">{count}</span>
    </button>
  );
}

function renderBucket(r: CompareReport, b: Bucket, rowPad: string, rootA: string, rootB: string) {
  if (b === "onlyA" || b === "onlyB") {
    const list = b === "onlyA" ? r.onlyA : r.onlyB;
    const side: "a" | "b" = b === "onlyA" ? "a" : "b";
    if (!list.length) return <Empty />;
    return list.map((e, i) => (
      <Row
        key={`${e.rel}-${i}`}
        path={e.rel}
        meta={formatBytes(Number(e.size))}
        rowPad={rowPad}
        rootA={rootA}
        rootB={rootB}
        side={side}
      />
    ));
  }
  const list = b === "identical" ? r.identical : b === "differ" ? r.differ : r.sizeDiffer;
  if (!list.length) return <Empty />;
  return list.map((e, i) => (
    <Row
      key={`${e.rel}-${i}`}
      path={e.rel}
      meta={`${formatBytes(Number(e.sizeA))} / ${formatBytes(Number(e.sizeB))}`}
      rowPad={rowPad}
      rootA={rootA}
      rootB={rootB}
      side="both"
    />
  ));
}

function joinPath(root: string, rel: string) {
  if (!root) return rel;
  const sep = root.includes("\\") && !root.includes("/") ? "\\" : "/";
  const trimmed = root.endsWith(sep) ? root.slice(0, -1) : root;
  return `${trimmed}${sep}${rel}`;
}

async function copy(text: string, label: string) {
  try {
    await writeText(text);
    toast.success(`${label} copied`);
  } catch (e) {
    toast.error(`Copy failed: ${errMsg(e)}`);
  }
}

function Row({
  path,
  meta,
  rowPad,
  rootA,
  rootB,
  side,
}: {
  path: string;
  meta: string;
  rowPad: string;
  rootA: string;
  rootB: string;
  side: "a" | "b" | "both";
}) {
  const onContextMenu = useContextMenu(() => {
    const items: Array<{ label: string; onSelect: () => void } | { type: "separator" }> = [
      { label: "Copy relative path", onSelect: () => copy(path, "Path") },
    ];
    if (side === "a" || side === "both") {
      items.push({ label: "Copy full path in A", onSelect: () => copy(joinPath(rootA, path), "Path") });
    }
    if (side === "b" || side === "both") {
      items.push({ label: "Copy full path in B", onSelect: () => copy(joinPath(rootB, path), "Path") });
    }
    return items;
  });
  return (
    <div
      className={`flex items-center gap-2 border-b text-[12px] last:border-0 ${rowPad}`}
      onContextMenu={onContextMenu}
    >
      <span className="flex-1 truncate font-mono" title={path}>{path}</span>
      <span className="text-[10px] text-muted-foreground">{meta}</span>
    </div>
  );
}

function Empty() {
  return <div className="p-6 text-center text-xs text-muted-foreground">No entries.</div>;
}
