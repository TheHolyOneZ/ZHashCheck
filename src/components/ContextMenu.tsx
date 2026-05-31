// Copyright (c) 2026 TheHolyOneZ


import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useContextMenuStore, type MenuEntry } from "@/store/contextMenu";

export function ContextMenu() {
  const open = useContextMenuStore((s) => s.open);
  const x = useContextMenuStore((s) => s.x);
  const y = useContextMenuStore((s) => s.y);
  const items = useContextMenuStore((s) => s.items);
  const close = useContextMenuStore((s) => s.close);

  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });


  useLayoutEffect(() => {
    if (!open) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 6;
    let nx = x;
    let ny = y;
    if (nx + r.width + margin > vw) nx = Math.max(margin, vw - r.width - margin);
    if (ny + r.height + margin > vh) ny = Math.max(margin, vh - r.height - margin);
    setPos({ x: nx, y: ny });
  }, [open, x, y, items]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    function onScroll() { close(); }
    function onResize() { close(); }
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70]"
      onMouseDown={(e) => {

        if (!ref.current?.contains(e.target as Node)) close();
      }}
      onContextMenu={(e) => {

        e.preventDefault();
        close();
      }}
    >
      <div
        ref={ref}
        role="menu"
        className="absolute min-w-[180px] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-xl"
        style={{ left: pos.x, top: pos.y }}
      >
        {items.map((it, i) => renderEntry(it, i, close))}
      </div>
    </div>
  );
}

function renderEntry(it: MenuEntry, i: number, close: () => void) {
  if (it.type === "separator") {
    return <div key={`sep-${i}`} className="my-1 h-px bg-border" />;
  }
  const danger = it.danger;
  const disabled = it.disabled;
  return (
    <button
      key={i}
      role="menuitem"
      type="button"
      disabled={disabled}
      onClick={async () => {
        if (disabled) return;
        close();
        try { await it.onSelect(); } catch {  }
      }}
      className={
        "flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[12px] transition " +
        (disabled
          ? "cursor-not-allowed text-muted-foreground/50"
          : danger
            ? "text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
            : "text-foreground hover:bg-accent hover:text-accent-foreground")
      }
    >
      <span className="flex-1 truncate">{it.label}</span>
      {it.hint && <span className="text-[10px] text-muted-foreground">{it.hint}</span>}
    </button>
  );
}
