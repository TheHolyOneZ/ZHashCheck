// Copyright (c) 2026 TheHolyOneZ

import { useCallback } from "react";
import { toast } from "sonner";
import { useDropFiles } from "@/hooks/useDropFiles";
import { useUiStore } from "@/store/ui";
import { useJobsStore } from "@/store/jobs";
import { hashFiles } from "@/lib/ipc";
import { errMsg } from "@/lib/format";

export function DropOverlay() {
  const setView = useUiStore((s) => s.setView);
  const defaultAlgos = useUiStore((s) => s.defaultAlgos);
  const setRunning = useJobsStore((s) => s.setRunning);
  const setCurrentJobId = useJobsStore((s) => s.setCurrentJobId);
  const clearRows = useJobsStore((s) => s.clearRows);
  const reset = useJobsStore((s) => s.reset);

  const onDrop = useCallback(
    async (paths: string[]) => {
      if (!paths.length) return;
      reset();
      clearRows();
      setView("hash");
      setRunning(true);
      try {
        const id = await hashFiles(paths, defaultAlgos);
        setCurrentJobId(id);
      } catch (e) {
        setRunning(false);
        toast.error(`Failed to start hash job: ${errMsg(e)}`);
      }
    },
    [defaultAlgos, setView, setRunning, setCurrentJobId, clearRows, reset],
  );

  const { over } = useDropFiles(onDrop);

  if (!over) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <div className="rounded-2xl border-2 border-dashed border-primary px-12 py-10 text-center">
        <div className="text-sm font-medium text-foreground">Drop to hash</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {defaultAlgos.join(" · ")}
        </div>
      </div>
    </div>
  );
}
