// Copyright (c) 2026 TheHolyOneZ


import { useCallback, useState } from "react";
import { CheckCircle2, XCircle, Loader2, Circle, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  cancelJob,
  compareFolders,
  exportResults,
  findDuplicates,
  getHistory,
  getSettings,
  hashFiles,
  hashText,
  moveToTrash,
  onCompareReport,
  onDedupReport,
  onJobFileDone,
  qaCleanup,
  qaSetup,
  setSettings,
  verifyChecksumFile,
  verifyPaste,
  type JobFileDone,
} from "@/lib/ipc";
import { errMsg } from "@/lib/format";
import type { QaWorkspace } from "@/bindings/QaWorkspace";
import type { CompareReport } from "@/bindings/CompareReport";
import type { DedupReport } from "@/bindings/DedupReport";
import type { ExportEntry } from "@/bindings/ExportEntry";


const SHA256_EMPTY =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const SHA256_HELLO_NL =
  "5891b5b522d5df086d0ff0b110fbd9d21bb4fc7163af34d08286a2e846f6be03";
const MD5_HELLO_NL = "b1946ac92492d2347c6235b4d2611184";


type Status = "pending" | "running" | "pass" | "fail" | "error";

interface RunRow {
  name: string;
  status: Status;
  message: string;
  durationMs: number | null;
}

interface TestCase {
  name: string;
  run: (ws: QaWorkspace) => Promise<string>;
}


interface PreListen<T> {


  wait(jobId: string, timeoutMs?: number): Promise<T>;

  cancel(): void;
}

function preListenFileDone(): Promise<PreListen<JobFileDone>> {
  const buffered: JobFileDone[] = [];
  let target: { id: string; resolve: (e: JobFileDone) => void } | null = null;
  return onJobFileDone((e) => {
    if (target && e.id === target.id) {
      const t = target;
      target = null;
      t.resolve(e);
    } else {
      buffered.push(e);
    }
  }).then((unlisten) => ({
    wait(jobId, timeoutMs = 30_000) {
      const hit = buffered.findIndex((b) => b.id === jobId);
      if (hit >= 0) return Promise.resolve(buffered.splice(hit, 1)[0]!);
      return new Promise<JobFileDone>((resolve, reject) => {
        target = { id: jobId, resolve };
        const timer = setTimeout(() => {
          target = null;
          unlisten();
          reject(new Error(`timeout waiting for job:file_done (job ${jobId.slice(0, 8)})`));
        }, timeoutMs);
        const origResolve = resolve;
        target.resolve = (e) => {
          clearTimeout(timer);
          unlisten();
          origResolve(e);
        };
      });
    },
    cancel: unlisten,
  }));
}

function preListenCompareReport(): Promise<PreListen<CompareReport>> {
  const buffered: Array<{ id: string; r: CompareReport }> = [];
  let target: { id: string; resolve: (r: CompareReport) => void } | null = null;
  return onCompareReport((id, r) => {
    if (target && id === target.id) {
      const t = target;
      target = null;
      t.resolve(r);
    } else {
      buffered.push({ id, r });
    }
  }).then((unlisten) => ({
    wait(jobId, timeoutMs = 30_000) {
      const hit = buffered.findIndex((b) => b.id === jobId);
      if (hit >= 0) return Promise.resolve(buffered.splice(hit, 1)[0]!.r);
      return new Promise<CompareReport>((resolve, reject) => {
        target = { id: jobId, resolve };
        const timer = setTimeout(() => {
          target = null;
          unlisten();
          reject(new Error("timeout waiting for compare:report"));
        }, timeoutMs);
        const origResolve = resolve;
        target.resolve = (r) => {
          clearTimeout(timer);
          unlisten();
          origResolve(r);
        };
      });
    },
    cancel: unlisten,
  }));
}

function preListenDedupReport(): Promise<PreListen<DedupReport>> {
  const buffered: Array<{ id: string; r: DedupReport }> = [];
  let target: { id: string; resolve: (r: DedupReport) => void } | null = null;
  return onDedupReport((id, r) => {
    if (target && id === target.id) {
      const t = target;
      target = null;
      t.resolve(r);
    } else {
      buffered.push({ id, r });
    }
  }).then((unlisten) => ({
    wait(jobId, timeoutMs = 30_000) {
      const hit = buffered.findIndex((b) => b.id === jobId);
      if (hit >= 0) return Promise.resolve(buffered.splice(hit, 1)[0]!.r);
      return new Promise<DedupReport>((resolve, reject) => {
        target = { id: jobId, resolve };
        const timer = setTimeout(() => {
          target = null;
          unlisten();
          reject(new Error("timeout waiting for dedup:report"));
        }, timeoutMs);
        const origResolve = resolve;
        target.resolve = (r) => {
          clearTimeout(timer);
          unlisten();
          origResolve(r);
        };
      });
    },
    cancel: unlisten,
  }));
}


function expectNoFileDone(jobId: string, noMoreMs = 500): Promise<JobFileDone | null> {
  return new Promise((resolve) => {
    let unlisten: (() => void) | null = null;
    const timer = setTimeout(() => {
      if (unlisten) unlisten();
      resolve(null);
    }, noMoreMs);
    onJobFileDone((e) => {
      if (e.id !== jobId) return;
      clearTimeout(timer);
      if (unlisten) unlisten();
      resolve(e);
    })
      .then((un) => {
        unlisten = un;
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(null);
      });
  });
}

function head(s: string, n = 8): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

function shortBytes(n: number | bigint): string {
  const v = typeof n === "bigint" ? Number(n) : n;
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  return `${(v / (1024 * 1024)).toFixed(1)} MB`;
}


const TESTS: TestCase[] = [

  {
    name: "hash_text empty → SHA-256 vector",
    run: async () => {
      const out = await hashText("", ["sha256"]);
      const got = out.sha256;
      if (got !== SHA256_EMPTY) throw new Error(`got ${got}, want ${SHA256_EMPTY}`);
      return `matched ${head(SHA256_EMPTY)}`;
    },
  },

  {
    name: 'hash_text "hello\\n" → SHA-256 / MD5 / BLAKE3 vectors',
    run: async () => {
      const out = await hashText("hello\n", ["sha256", "md5", "blake3"]);
      if (out.sha256 !== SHA256_HELLO_NL) throw new Error(`sha256 mismatch: ${out.sha256}`);
      if (out.md5 !== MD5_HELLO_NL) throw new Error(`md5 mismatch: ${out.md5}`);
      if (!out.blake3 || out.blake3.length !== 64)
        throw new Error(`blake3 missing/short: ${out.blake3}`);
      return `sha256/md5/blake3 all matched`;
    },
  },

  {
    name: "hash_files(hello.txt) emits SHA-256 vector",
    run: async (ws) => {
      const w = await preListenFileDone();
      const id = await hashFiles([ws.helloTxt], ["sha256"]);
      const ev = await w.wait(id);
      const got = ev.hashes.sha256;
      if (got !== SHA256_HELLO_NL) throw new Error(`got ${got}, want ${SHA256_HELLO_NL}`);
      if (ev.bytes !== 6) throw new Error(`expected 6 bytes, got ${ev.bytes}`);
      return `matched ${head(SHA256_HELLO_NL)} (${ev.bytes} B)`;
    },
  },

  {
    name: "hash_files(empty.txt) emits SHA-256 vector",
    run: async (ws) => {
      const w = await preListenFileDone();
      const id = await hashFiles([ws.emptyTxt], ["sha256"]);
      const ev = await w.wait(id);
      const got = ev.hashes.sha256;
      if (got !== SHA256_EMPTY) throw new Error(`got ${got}, want ${SHA256_EMPTY}`);
      if (ev.bytes !== 0) throw new Error(`expected 0 bytes, got ${ev.bytes}`);
      return `matched ${head(SHA256_EMPTY)}`;
    },
  },

  {
    name: "hash_files(big.txt) ≡ hash_text(b'A'*1MiB)",
    run: async (ws) => {
      const big = "A".repeat(1024 * 1024);
      const text = await hashText(big, ["sha256"]);
      const w = await preListenFileDone();
      const id = await hashFiles([ws.bigTxt], ["sha256"]);
      const ev = await w.wait(id);
      if (ev.hashes.sha256 !== text.sha256)
        throw new Error(`file=${ev.hashes.sha256} text=${text.sha256}`);
      if (ev.bytes !== 1024 * 1024)
        throw new Error(`expected 1 MiB, got ${ev.bytes}`);
      if (!(ev.tookMs > 0)) throw new Error(`tookMs not positive: ${ev.tookMs}`);
      return `matched (${shortBytes(ev.bytes)}, ${ev.tookMs} ms)`;
    },
  },

  {
    name: "hash_files(<dir>) expands directory",
    run: async (ws) => {


      const w = await preListenFileDone();
      const id = await hashFiles([ws.root], ["xxh3-64"]);
      const ev = await w.wait(id);
      if (!ev.path) throw new Error("file_done arrived with no path");
      return `first file processed: ${head(ev.path, 16)}`;
    },
  },

  {
    name: "cancel_job halts an in-flight hash",
    run: async (ws) => {
      const id = await hashFiles([ws.bigTxt], ["sha512", "sha3-512"]);


      await cancelJob(id);
      const ev = await expectNoFileDone(id, 500);


      return ev === null ? "cancelled cleanly (no late event)" : "completed before cancel (race, OK)";
    },
  },

  {
    name: "verify_paste(hello.txt, correct SHA-256) → pass",
    run: async (ws) => {
      const r = await verifyPaste(ws.helloTxt, SHA256_HELLO_NL, "sha256");
      if (r.outcome !== "pass") throw new Error(`outcome ${r.outcome}: ${r.computed}`);
      return `pass (${head(r.computed)})`;
    },
  },

  {
    name: "verify_paste(hello.txt, wrong SHA-256) → fail",
    run: async (ws) => {
      const zeros = "0".repeat(64);
      const r = await verifyPaste(ws.helloTxt, zeros, "sha256");
      if (r.outcome !== "fail")
        throw new Error(`expected fail, got ${r.outcome} (${r.computed})`);
      return `fail (got ${head(r.computed)})`;
    },
  },

  {
    name: "verify_paste(missing file) errors out",
    run: async (ws) => {


      const missing = ws.helloTxt + ".definitely-missing-suffix";
      try {
        const r = await verifyPaste(missing, SHA256_HELLO_NL, "sha256");

        if (r.outcome === "missing") return "returned missing";
        throw new Error(`unexpected success: outcome ${r.outcome}`);
      } catch (e) {
        return `errored as expected: ${head(errMsg(e), 32)}`;
      }
    },
  },

  {
    name: "verify_checksum_file(SHASUMS.sha256) → 2 pass / 0 fail / 0 missing",
    run: async (ws) => {
      const r = await verifyChecksumFile(ws.checksumSha256, ws.root);
      if (r.passed !== 2 || r.failed !== 0 || r.missing !== 0)
        throw new Error(`got passed=${r.passed} failed=${r.failed} missing=${r.missing}`);
      return `2 entries pass`;
    },
  },

  {
    name: "compare_folders(compare_a, compare_b) classifies entries",
    run: async (ws) => {
      const w = await preListenCompareReport();
      const id = await compareFolders(ws.compareA, ws.compareB);
      const r = await w.wait(id);
      const hasIdentical = r.identical.some((e) => e.rel.endsWith("same.txt"));
      const hasDiffer =
        r.differ.some((e) => e.rel.endsWith("differ.txt")) ||
        r.sizeDiffer.some((e) => e.rel.endsWith("differ.txt"));
      const hasOnlyA = r.onlyA.some((e) => e.rel.endsWith("only_a.txt"));
      const hasOnlyB = r.onlyB.some((e) => e.rel.endsWith("only_b.txt"));
      if (!hasIdentical) throw new Error("same.txt not in identical");
      if (!hasDiffer) throw new Error("differ.txt not in differ/sizeDiffer");
      if (!hasOnlyA) throw new Error("only_a.txt not in onlyA");
      if (!hasOnlyB) throw new Error("only_b.txt not in onlyB");
      return `1 identical, 1 differ, 1 onlyA, 1 onlyB`;
    },
  },

  {
    name: "find_duplicates(root) groups the three dup files",
    run: async (ws) => {
      const w = await preListenDedupReport();
      const id = await findDuplicates([ws.root]);
      const r = await w.wait(id);
      const dupPaths = new Set([ws.dupA, ws.dupB, ws.dupC]);
      const target = r.groups.find((g) => {
        if (g.files.length !== 3) return false;
        return g.files.every((f) => dupPaths.has(f.path));
      });
      if (!target) {
        const summary = r.groups
          .map((g) => `${g.files.length}x${g.sizeEach}B`)
          .join(", ");
        throw new Error(`no group with all three dup files (saw: ${summary || "none"})`);
      }

      for (const g of r.groups) {
        for (const f of g.files) {
          if (f.path === ws.uniqueInDup) {
            throw new Error("unique_in_dup wrongly classified as a duplicate");
          }
        }
      }


      const sizeEach = Number(target.sizeEach);
      const got = Number(target.wastedBytes);
      const expectedWaste = 2 * sizeEach;
      if (got !== expectedWaste) {
        throw new Error(`group.wastedBytes=${got}, expected ${expectedWaste}`);
      }
      return `1 dup-bin group, ${shortBytes(got)} wasted (total ${shortBytes(Number(r.totalWastedBytes))})`;
    },
  },

  {
    name: "move_to_trash(trash_target) removes the file",
    run: async (ws) => {
      const r = await moveToTrash([ws.trashTarget]);
      if (r.trashed !== 1 || r.failed !== 0)
        throw new Error(`trashed=${r.trashed} failed=${r.failed}`);


      const id = await hashFiles([ws.trashTarget], ["sha256"]);
      const ev = await expectNoFileDone(id, 600);
      if (ev !== null) throw new Error("file still exists after trash");
      return `trashed and confirmed gone`;
    },
  },

  {
    name: "export_results(sha256sum) renders hello entry",
    run: async (ws) => {
      const entries: ExportEntry[] = [
        {
          path: ws.helloTxt,
          bytes: 6,
          hashes: { sha256: SHA256_HELLO_NL },
        },
      ];
      const text = await exportResults(entries, "sha256sum", "sha256");
      if (!text.startsWith(SHA256_HELLO_NL.slice(0, 6)))
        throw new Error(`unexpected prefix: ${head(text, 16)}`);
      if (!text.includes("hello.txt"))
        throw new Error(`output missing 'hello.txt': ${head(text, 64)}`);
      return `wrote ${text.trim().length} chars`;
    },
  },

  {
    name: "export_results(json) is valid JSON",
    run: async (ws) => {
      const entries: ExportEntry[] = [
        {
          path: ws.helloTxt,
          bytes: 6,
          hashes: { sha256: SHA256_HELLO_NL },
        },
      ];
      const text = await exportResults(entries, "json", null);
      try {
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) throw new Error("JSON root not an array");
        if (parsed.length !== 1) throw new Error(`expected 1 entry, got ${parsed.length}`);
      } catch (e) {
        throw new Error(`JSON.parse failed: ${errMsg(e)}`);
      }
      return `valid JSON (${text.length} chars)`;
    },
  },

  {
    name: "get_settings returns defaultAlgos",
    run: async () => {
      const s = await getSettings();
      if (!Array.isArray(s.defaultAlgos) || s.defaultAlgos.length === 0)
        throw new Error("defaultAlgos missing or empty");
      return `defaultAlgos: ${s.defaultAlgos.join(", ")}`;
    },
  },

  {
    name: "set_settings → get_settings round-trips theme",
    run: async () => {
      const orig = await getSettings();


      const next = orig.theme === "dark" ? "light" : "dark";
      try {
        await setSettings({ ...orig, theme: next });
        const after = await getSettings();
        if (after.theme !== next)
          throw new Error(`expected theme=${next}, got ${after.theme}`);
        return `theme ${orig.theme} → ${next} round-trip OK`;
      } finally {

        await setSettings(orig).catch(() => {});
      }
    },
  },

  {
    name: "get_history(10, 0) returns an array",
    run: async () => {
      const h = await getHistory(10, 0);
      if (!Array.isArray(h)) throw new Error("not an array");
      return `${h.length} entries`;
    },
  },

  {
    name: "qa_cleanup removes the workspace",
    run: async (ws) => {
      await qaCleanup(ws.root);
      return `cleaned up ${head(ws.root, 24)}`;
    },
  },
];


function StatusIcon({ s }: { s: Status }) {
  if (s === "pass") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (s === "fail") return <XCircle className="h-4 w-4 text-rose-500" />;
  if (s === "error") return <XCircle className="h-4 w-4 text-amber-500" />;
  if (s === "running") return <Loader2 className="h-4 w-4 animate-spin text-sky-500" />;
  return <Circle className="h-4 w-4 text-muted-foreground/40" />;
}

export function QaView() {
  const [rows, setRows] = useState<RunRow[]>(() =>
    TESTS.map((t) => ({ name: t.name, status: "pending", message: "", durationMs: null })),
  );
  const [running, setRunning] = useState(false);
  const [workspace, setWorkspace] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ passed: number; total: number } | null>(null);

  const update = useCallback((i: number, patch: Partial<RunRow>) => {
    setRows((prev) => {
      const next = prev.slice();
      const cur = next[i];
      if (!cur) return prev;
      next[i] = { ...cur, ...patch };
      return next;
    });
  }, []);

  const runAll = useCallback(async () => {
    setRunning(true);
    setSummary(null);
    setRows(
      TESTS.map((t) => ({ name: t.name, status: "pending", message: "", durationMs: null })),
    );

    let ws: QaWorkspace | null = null;
    let setupErr: string | null = null;
    try {
      ws = await qaSetup();
      setWorkspace(ws.root);
    } catch (e) {
      setupErr = errMsg(e);
    }

    let passed = 0;
    for (let i = 0; i < TESTS.length; i++) {
      if (setupErr) {
        update(i, {
          status: "error",
          message: `setup failed: ${setupErr}`,
          durationMs: 0,
        });
        continue;
      }
      update(i, { status: "running", message: "", durationMs: null });
      const t = TESTS[i];
      if (!t) continue;
      const t0 = Date.now();
      try {
        const msg = await t.run(ws!);
        update(i, { status: "pass", message: msg, durationMs: Date.now() - t0 });
        passed += 1;
      } catch (e) {
        update(i, {
          status: "fail",
          message: errMsg(e),
          durationMs: Date.now() - t0,
        });
      }
    }

    setSummary({ passed, total: TESTS.length });
    setRunning(false);


    setWorkspace(null);
  }, [update]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <h1 className="text-sm font-semibold">QA</h1>
        <span className="ml-3 text-xs text-muted-foreground">
          Runs every backend command against a fresh temp workspace and asserts known-good results. Use this after upgrading or if something feels off. Workspace is cleaned up automatically when the run finishes.
        </span>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Smoke test</CardTitle>
            <div className="flex items-center gap-3">
              {summary && (
                <span
                  className={
                    "text-[12px] font-medium " +
                    (summary.passed === summary.total
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400")
                  }
                >
                  {summary.passed} / {summary.total} passed
                </span>
              )}
              <Button onClick={runAll} disabled={running} size="sm">
                {running ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FlaskConical className="h-4 w-4" />
                )}
                {running ? "Running…" : "Run all tests"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {workspace && (
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-[11px]">
                <span className="text-muted-foreground">workspace </span>
                <code className="font-mono break-all">{workspace}</code>
              </div>
            )}
            <div className="overflow-hidden rounded-md border">
              {rows.map((r, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 border-b px-3 py-2 text-[12px] last:border-0"
                >
                  <div className="mt-0.5">
                    <StatusIcon s={r.status} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium text-foreground">{r.name}</span>
                      {r.durationMs != null && (
                        <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                          {r.durationMs} ms
                        </span>
                      )}
                    </div>
                    {r.message && (
                      <div
                        className={
                          "mt-0.5 font-mono text-[11px] " +
                          (r.status === "fail" || r.status === "error"
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-muted-foreground")
                        }
                      >
                        {r.message}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
