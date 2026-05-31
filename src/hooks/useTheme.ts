// Copyright (c) 2026 TheHolyOneZ

import { useEffect } from "react";
import { useUiStore } from "@/store/ui";

export function useTheme() {
  const theme = useUiStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      const dark = theme === "dark" || (theme === "system" && mql.matches);
      root.classList.toggle("dark", dark);
    };
    apply();
    if (theme === "system") {
      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      mql.addEventListener("change", apply);
      return () => mql.removeEventListener("change", apply);
    }
    return undefined;
  }, [theme]);
}
