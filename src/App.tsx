// Copyright (c) 2026 TheHolyOneZ

import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { toast } from "sonner";
import { Toaster } from "sonner";
import { Sidebar } from "@/components/Sidebar";
import { StatusBar } from "@/components/StatusBar";
import { CommandPalette } from "@/components/CommandPalette";
import { ContextMenu } from "@/components/ContextMenu";
import { DropOverlay } from "@/components/DropOverlay";
import { useDisableNativeContextMenu } from "@/hooks/useContextMenu";
import { HashView } from "@/routes/HashView";
import { VerifyView } from "@/routes/VerifyView";
import { CompareView } from "@/routes/CompareView";
import { DuplicatesView } from "@/routes/DuplicatesView";
import { HistoryView } from "@/routes/HistoryView";
import { SettingsView } from "@/routes/SettingsView";
import { QaView } from "@/routes/QaView";
import { AboutView } from "@/routes/AboutView";
import { useTheme } from "@/hooks/useTheme";
import { useGlobalHotkeys } from "@/hooks/useGlobalHotkeys";
import { useUiStore, type ViewId } from "@/store/ui";
import { useJobsStore } from "@/store/jobs";
import { hashFiles } from "@/lib/ipc";
import { errMsg } from "@/lib/format";

const views: Record<ViewId, () => JSX.Element> = {
  hash: HashView,
  verify: VerifyView,
  compare: CompareView,
  duplicates: DuplicatesView,
  history: HistoryView,
  settings: SettingsView,
  qa: QaView,
  about: AboutView,
};

export function App() {
  useTheme();
  useDisableNativeContextMenu();
  const view = useUiStore((s) => s.view);
  const setView = useUiStore((s) => s.setView);
  const defaultAlgos = useUiStore((s) => s.defaultAlgos);
  const [paletteOpen, setPaletteOpen] = useState(false);
  useGlobalHotkeys({ onOpenPalette: () => setPaletteOpen(true) });

  useEffect(() => {
    const unsubs: Array<Promise<() => void>> = [];
    unsubs.push(listen<string>("menu:view", (e) => setView(e.payload as ViewId)));
    unsubs.push(listen<string>("menu:action", async (e) => {
      switch (e.payload) {
        case "open_files": {
          const sel = await openDialog({ multiple: true });
          if (!sel) return;
          const paths = Array.isArray(sel) ? sel : [sel];
          const { reset, clearRows, setRunning, setCurrentJobId } = useJobsStore.getState();
          reset(); clearRows(); setRunning(true); setView("hash");
          try {
            const id = await hashFiles(paths, defaultAlgos);
            setCurrentJobId(id);
          } catch (err) {
            setRunning(false);
            toast.error(`Failed to start: ${errMsg(err)}`);
          }
          break;
        }
        case "open_folder": {
          const sel = await openDialog({ directory: true });
          if (!sel) return;
          const { reset, clearRows, setRunning, setCurrentJobId } = useJobsStore.getState();
          reset(); clearRows(); setRunning(true); setView("hash");
          try {
            const id = await hashFiles([sel as string], defaultAlgos);
            setCurrentJobId(id);
          } catch (err) {
            setRunning(false);
            toast.error(`Failed to start: ${errMsg(err)}`);
          }
          break;
        }
        case "palette":
          setPaletteOpen(true);
          break;
        case "about":
          setView("about");
          break;
      }
    }));
    return () => { unsubs.forEach((p) => p.then((un) => un()).catch(() => {})); };
  }, [setView, defaultAlgos]);

  const Current = views[view];

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="relative flex min-h-0 flex-1 flex-col">
          <Current />
        </main>
      </div>
      <StatusBar />
      <DropOverlay />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <ContextMenu />
      <Toaster richColors position="bottom-right" theme="system" />
    </div>
  );
}
