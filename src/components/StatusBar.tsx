// Copyright (c) 2026 TheHolyOneZ

import { useEffect } from "react";
import { useJobsStore } from "@/store/jobs";
import {
  onJobDone,
  onJobFileDone,
  onJobError,
  onJobProgress,
} from "@/lib/ipc";
import { formatBytes, formatDuration, formatRate } from "@/lib/format";

export function StatusBar() {
  const s = useJobsStore();


  useEffect(() => {
    const unsubs: Array<Promise<() => void>> = [];
    unsubs.push(onJobProgress((p) => {
      s.setProgress({
        filesDone: Number(p.filesDone),
        filesTotal: Number(p.filesTotal),
        bytesDone: Number(p.bytesDone),
        bytesTotal: Number(p.bytesTotal),
        throughputBps: Number(p.throughputBps),
        etaS: p.etaS == null ? null : Number(p.etaS),
      });
    }));
    unsubs.push(onJobFileDone((e) => {
      s.appendRow({
        id: `${e.path}-${Date.now()}`,
        path: e.path,
        bytes: Number(e.bytes),
        hashes: e.hashes,
        tookMs: Number(e.tookMs),
      });
    }));
    unsubs.push(onJobError((e) => {
      if (e.path) {
        s.appendRow({
          id: `${e.path}-err-${Date.now()}`,
          path: e.path,
          bytes: 0,
          hashes: {} as Record<string, string>,
          tookMs: 0,
          error: e.message,
        });
      }
    }));
    unsubs.push(onJobDone(() => {
      s.setRunning(false);
    }));
    return () => { unsubs.forEach((p) => p.then((un) => un()).catch(() => {})); };

  }, []);

  const progress = s.bytesTotal > 0 ? (s.bytesDone / s.bytesTotal) * 100 : 0;

  return (
    <footer className="flex h-7 items-center gap-4 border-t bg-card/30 px-3 text-[11px] text-muted-foreground">
      <span className="font-medium text-foreground">
        {s.running ? "running" : "idle"}
      </span>
      {s.running && (
        <>
          <span>{s.filesDone}/{s.filesTotal} files</span>
          <span>{formatBytes(s.bytesDone)} / {formatBytes(s.bytesTotal)}</span>
          <span>{formatRate(s.throughputBps)}</span>
          <span>ETA {formatDuration(s.etaS)}</span>
        </>
      )}
      <div className="ml-auto flex items-center gap-2">
        {s.running && (
          <div className="h-1 w-32 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-[width] duration-200" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
    </footer>
  );
}
