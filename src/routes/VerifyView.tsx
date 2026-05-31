// Copyright (c) 2026 TheHolyOneZ

import { useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { toast } from "sonner";
import { FileSearch, Check, X, AlertCircle, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { verifyChecksumFile, verifyPaste } from "@/lib/ipc";
import { algoLabel, errMsg } from "@/lib/format";
import { useContextMenu } from "@/hooks/useContextMenu";
import type { PasteVerify } from "@/bindings/PasteVerify";
import type { ChecksumFileReport } from "@/bindings/ChecksumFileReport";
import type { ChecksumEntryResult } from "@/bindings/ChecksumEntryResult";
import type { VerifyOutcome } from "@/bindings/VerifyOutcome";

function OutcomePill({ o }: { o: VerifyOutcome }) {
  if (o === "pass") return (
    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
      <Check className="h-3 w-3" /> pass
    </span>
  );
  if (o === "fail") return (
    <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 px-1.5 py-0.5 text-[11px] font-medium text-rose-700 dark:text-rose-300">
      <X className="h-3 w-3" /> fail
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
      <AlertCircle className="h-3 w-3" /> missing
    </span>
  );
}

import { useUiStore } from "@/store/ui";

export function VerifyView() {
  const density = useUiStore((s) => s.density);
  const rowPad = density === "compact" ? "px-2 py-1" : "px-2 py-1.5";
  const [filePath, setFilePath] = useState("");
  const [expected, setExpected] = useState("");
  const [pasteResult, setPasteResult] = useState<PasteVerify | null>(null);
  const [busyPaste, setBusyPaste] = useState(false);

  const [checksumPath, setChecksumPath] = useState("");
  const [rootDir, setRootDir] = useState("");
  const [report, setReport] = useState<ChecksumFileReport | null>(null);
  const [busyReport, setBusyReport] = useState(false);

  async function pickFile() {
    const p = await openDialog({ multiple: false });
    if (typeof p === "string") setFilePath(p);
  }
  async function pickChecksum() {
    const p = await openDialog({
      multiple: false,
      filters: [
        { name: "Checksum files", extensions: ["sha256", "sha1", "sha512", "md5", "blake3", "txt"] },
      ],
    });
    if (typeof p === "string") setChecksumPath(p);
  }
  async function pickRoot() {
    const p = await openDialog({ directory: true });
    if (typeof p === "string") setRootDir(p);
  }

  async function runPaste() {
    if (!filePath || !expected.trim()) {
      toast.error("Pick a file and paste an expected hash.");
      return;
    }
    setBusyPaste(true);
    setPasteResult(null);
    try {
      const r = await verifyPaste(filePath, expected.trim(), null);
      setPasteResult(r);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusyPaste(false);
    }
  }

  async function runReport() {
    if (!checksumPath) {
      toast.error("Pick a checksum file.");
      return;
    }
    setBusyReport(true);
    setReport(null);
    try {
      const r = await verifyChecksumFile(checksumPath, rootDir || null);
      setReport(r);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusyReport(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <h1 className="text-sm font-semibold">Verify</h1>
        <span className="ml-3 text-xs text-muted-foreground">
          Compare a file to an expected hash, or validate a whole checksum file at once. The algorithm is detected from the hash length, and comparisons run in constant time.
        </span>
      </header>

      <div className="grid grid-cols-1 gap-4 overflow-auto p-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Paste a hash</CardTitle>
            <p className="text-[11px] text-muted-foreground">
              Use when an upstream publisher gave you a single hex string — paste it here and we'll figure out which algorithm it is by length and compare in constant time.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder="Path to file…"
                className="font-mono text-xs"
              />
              <Button variant="outline" size="sm" onClick={pickFile}>
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
            <Input
              value={expected}
              onChange={(e) => setExpected(e.target.value)}
              placeholder="Expected hex hash (algorithm auto-detected)…"
              className="font-mono text-xs"
            />
            <Button onClick={runPaste} disabled={busyPaste} size="sm">
              <FileSearch className="h-4 w-4" /> {busyPaste ? "Verifying…" : "Verify"}
            </Button>

            {pasteResult && (
              <div className="rounded-md border p-3 text-xs">
                <div className="flex items-center gap-2">
                  <OutcomePill o={pasteResult.outcome} />
                  <span className="text-muted-foreground">{algoLabel(pasteResult.algo)}</span>
                </div>
                <div className="mt-2 space-y-1">
                  <div><span className="text-muted-foreground">expected </span><code className="font-mono">{pasteResult.expected}</code></div>
                  <div><span className="text-muted-foreground">computed </span><code className="font-mono">{pasteResult.computed}</code></div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Checksum file</CardTitle>
            <p className="text-[11px] text-muted-foreground">
              Use when you have a <code className="font-mono">SHASUMS.sha256</code> or <code className="font-mono">.md5</code> file from a release — every line is checked against the file it names. Root folder is where the listed paths resolve from.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={checksumPath}
                onChange={(e) => setChecksumPath(e.target.value)}
                placeholder="SHASUMS / .sha256 / .md5 file…"
                className="font-mono text-xs"
              />
              <Button variant="outline" size="sm" onClick={pickChecksum}>
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                value={rootDir}
                onChange={(e) => setRootDir(e.target.value)}
                placeholder="Root folder (defaults to checksum file's folder)…"
                className="font-mono text-xs"
              />
              <Button variant="outline" size="sm" onClick={pickRoot}>
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={runReport} disabled={busyReport} size="sm">
              <FileSearch className="h-4 w-4" /> {busyReport ? "Verifying…" : "Verify all"}
            </Button>

            {report && (
              <div className="space-y-2">
                <div className="flex gap-3 text-[11px]">
                  <span className="text-emerald-600 dark:text-emerald-400">{report.passed} pass</span>
                  <span className="text-rose-600 dark:text-rose-400">{report.failed} fail</span>
                  <span className="text-amber-600 dark:text-amber-400">{report.missing} missing</span>
                </div>
                <div className="max-h-72 overflow-auto rounded-md border">
                  {report.entries.map((e, i) => (
                    <VerifyRow
                      key={`${e.path}-${i}`}
                      e={e}
                      className={`flex items-center gap-2 border-b text-[12px] last:border-0 ${rowPad}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function VerifyRow({ e, className }: { e: ChecksumEntryResult; className: string }) {
  const onContextMenu = useContextMenu(() => {
    const items = [
      {
        label: "Copy path",
        onSelect: async () => {
          try { await writeText(e.path); toast.success("Path copied"); }
          catch (err) { toast.error(`Copy failed: ${errMsg(err)}`); }
        },
      },
      {
        label: "Copy expected hash",
        onSelect: async () => {
          try { await writeText(e.expected); toast.success("Expected hash copied"); }
          catch (err) { toast.error(`Copy failed: ${errMsg(err)}`); }
        },
      },
    ];
    if (e.computed) {
      items.push({
        label: "Copy computed hash",
        onSelect: async () => {
          try { await writeText(e.computed!); toast.success("Computed hash copied"); }
          catch (err) { toast.error(`Copy failed: ${errMsg(err)}`); }
        },
      });
    }
    return items;
  });
  return (
    <div className={className} onContextMenu={onContextMenu}>
      <OutcomePill o={e.outcome} />
      <span className="flex-1 truncate font-mono" title={e.path}>{e.path}</span>
      <span className="text-[10px] text-muted-foreground">{algoLabel(e.algo)}</span>
    </div>
  );
}
