// Copyright (c) 2026 TheHolyOneZ

import { useHotkeys } from "react-hotkeys-hook";
import { useUiStore } from "@/store/ui";
import { useJobsStore } from "@/store/jobs";
import { cancelJob } from "@/lib/ipc";

export function useGlobalHotkeys({ onOpenPalette }: { onOpenPalette: () => void }) {
  const setView = useUiStore((s) => s.setView);

  useHotkeys("mod+k", (e) => { e.preventDefault(); onOpenPalette(); });

  useHotkeys("mod+1", (e) => { e.preventDefault(); setView("hash"); });
  useHotkeys("mod+2", (e) => { e.preventDefault(); setView("verify"); });
  useHotkeys("mod+3", (e) => { e.preventDefault(); setView("compare"); });
  useHotkeys("mod+4", (e) => { e.preventDefault(); setView("duplicates"); });
  useHotkeys("mod+5", (e) => { e.preventDefault(); setView("history"); });
  useHotkeys("mod+6", (e) => { e.preventDefault(); setView("settings"); });
  useHotkeys("mod+7", (e) => { e.preventDefault(); setView("qa"); });
  useHotkeys("mod+8", (e) => { e.preventDefault(); setView("about"); });

  useHotkeys("mod+comma", (e) => { e.preventDefault(); setView("settings"); });

  useHotkeys("escape", () => {
    const id = useJobsStore.getState().currentJobId;
    if (id && useJobsStore.getState().running) {
      void cancelJob(id);
    }
  });
}
