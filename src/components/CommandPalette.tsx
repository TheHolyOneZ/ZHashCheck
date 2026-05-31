// Copyright (c) 2026 TheHolyOneZ

import { useEffect } from "react";
import { Command } from "cmdk";
import {
  Hash,
  ShieldCheck,
  GitCompareArrows,
  Copy as CopyIcon,
  History,
  Settings as SettingsIcon,
  Moon,
  Sun,
  Monitor,
  FlaskConical,
  Info,
} from "lucide-react";
import { useUiStore, type ViewId } from "@/store/ui";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const VIEW_ITEMS: { id: ViewId; label: string; icon: typeof Hash; hint: string }[] = [
  { id: "hash",       label: "Go to Hash",       icon: Hash,             hint: "⌘1" },
  { id: "verify",     label: "Go to Verify",     icon: ShieldCheck,      hint: "⌘2" },
  { id: "compare",    label: "Go to Compare",    icon: GitCompareArrows, hint: "⌘3" },
  { id: "duplicates", label: "Go to Duplicates", icon: CopyIcon,         hint: "⌘4" },
  { id: "history",    label: "Go to History",    icon: History,          hint: "⌘5" },
  { id: "settings",   label: "Go to Settings",   icon: SettingsIcon,     hint: "⌘6" },
  { id: "qa",         label: "Go to QA",         icon: FlaskConical,     hint: "⌘7" },
  { id: "about",      label: "Go to About",      icon: Info,             hint: "⌘8" },
];

export function CommandPalette({ open, onOpenChange }: Props) {
  const setView = useUiStore((s) => s.setView);
  const setTheme = useUiStore((s) => s.setTheme);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onOpenChange(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  function close() { onOpenChange(false); }
  function go(id: ViewId) { setView(id); close(); }
  function theme(t: "system" | "light" | "dark") { setTheme(t); close(); }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-background/70 backdrop-blur-sm pt-[18vh]"
      onClick={close}
    >
      <Command
        loop
        onClick={(e) => e.stopPropagation()}
        className="w-[560px] max-w-[90vw] overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-2xl"
      >
        <Command.Input
          autoFocus
          placeholder="Type a command…"
          className="h-12 w-full border-b bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground"
        />
        <Command.List className="max-h-[60vh] overflow-y-auto p-1">
          <Command.Empty className="p-4 text-center text-sm text-muted-foreground">
            No results.
          </Command.Empty>

          <Command.Group heading="Navigation" className="px-2 py-1 text-[11px] uppercase tracking-wider text-muted-foreground">
            {VIEW_ITEMS.map(({ id, label, icon: Icon, hint }) => (
              <Command.Item
                key={id}
                value={label}
                onSelect={() => go(id)}
                className="flex h-9 cursor-pointer items-center gap-2 rounded-md px-2 text-sm text-foreground aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{label}</span>
                <kbd className="text-[10px] text-muted-foreground">{hint}</kbd>
              </Command.Item>
            ))}
          </Command.Group>

          <Command.Group heading="Theme" className="px-2 py-1 text-[11px] uppercase tracking-wider text-muted-foreground">
            <Command.Item value="Theme System" onSelect={() => theme("system")} className="flex h-9 cursor-pointer items-center gap-2 rounded-md px-2 text-sm aria-selected:bg-accent">
              <Monitor className="h-4 w-4" /> System theme
            </Command.Item>
            <Command.Item value="Theme Light" onSelect={() => theme("light")} className="flex h-9 cursor-pointer items-center gap-2 rounded-md px-2 text-sm aria-selected:bg-accent">
              <Sun className="h-4 w-4" /> Light theme
            </Command.Item>
            <Command.Item value="Theme Dark" onSelect={() => theme("dark")} className="flex h-9 cursor-pointer items-center gap-2 rounded-md px-2 text-sm aria-selected:bg-accent">
              <Moon className="h-4 w-4" /> Dark theme
            </Command.Item>
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
