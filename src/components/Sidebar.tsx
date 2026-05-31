// Copyright (c) 2026 TheHolyOneZ

import {
  Hash,
  ShieldCheck,
  GitCompareArrows,
  Copy,
  History,
  Settings as SettingsIcon,
  FlaskConical,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiStore, type ViewId } from "@/store/ui";
import iconUrl from "@/assets/icon.png";

const items: { id: ViewId; label: string; icon: typeof Hash; shortcut: string }[] = [
  { id: "hash",       label: "Hash",       icon: Hash,             shortcut: "1" },
  { id: "verify",     label: "Verify",     icon: ShieldCheck,      shortcut: "2" },
  { id: "compare",    label: "Compare",    icon: GitCompareArrows, shortcut: "3" },
  { id: "duplicates", label: "Duplicates", icon: Copy,             shortcut: "4" },
  { id: "history",    label: "History",    icon: History,          shortcut: "5" },
  { id: "settings",   label: "Settings",   icon: SettingsIcon,     shortcut: "6" },
  { id: "qa",         label: "QA",         icon: FlaskConical,     shortcut: "7" },
  { id: "about",      label: "About",      icon: Info,             shortcut: "8" },
];

export function Sidebar() {
  const view = useUiStore((s) => s.view);
  const setView = useUiStore((s) => s.setView);

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r bg-card/30">
      <div className="flex h-12 items-center gap-2 px-4">
        <img src={iconUrl} alt="" className="h-5 w-5" draggable={false} />
        <span className="text-sm font-semibold tracking-tight">ZHashCheck</span>
      </div>
      <nav className="flex flex-col gap-0.5 px-2 py-2">
        {items.map(({ id, label, icon: Icon, shortcut }) => {
          const active = view === id;
          return (
            <button
              key={id}
              onClick={() => setView(id)}
              className={cn(
                "group flex h-8 items-center gap-2 rounded-md px-2 text-sm transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1 text-left">{label}</span>
              <kbd className="hidden text-[10px] text-muted-foreground group-hover:inline-block">⌘{shortcut}</kbd>
            </button>
          );
        })}
      </nav>
      <div className="mt-auto px-4 py-3 text-[11px] text-muted-foreground">
        <div>Press <kbd className="rounded border px-1">⌘K</kbd> for commands</div>
      </div>
    </aside>
  );
}
