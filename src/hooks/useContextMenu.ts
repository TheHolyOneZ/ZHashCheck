// Copyright (c) 2026 TheHolyOneZ


import { useCallback, useEffect } from "react";
import { useContextMenuStore, type MenuEntry } from "@/store/contextMenu";

export function useContextMenu(build: () => MenuEntry[] | null | undefined) {
  const openAt = useContextMenuStore((s) => s.openAt);
  return useCallback(
    (e: React.MouseEvent) => {
      const items = build();
      if (!items || items.length === 0) return;
      e.preventDefault();
      e.stopPropagation();
      openAt(e.clientX, e.clientY, items);
    },
    [build, openAt],
  );
}


export function useDisableNativeContextMenu() {
  useEffect(() => {
    function onMenu(e: MouseEvent) {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (
        t.tagName === "INPUT" ||
        t.tagName === "TEXTAREA" ||
        t.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
    }
    window.addEventListener("contextmenu", onMenu);
    return () => window.removeEventListener("contextmenu", onMenu);
  }, []);
}
