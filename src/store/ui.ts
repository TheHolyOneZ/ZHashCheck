// Copyright (c) 2026 TheHolyOneZ

import { create } from "zustand";
import type { Algo } from "@/bindings/Algo";

export type ViewId = "hash" | "verify" | "compare" | "duplicates" | "history" | "settings" | "qa" | "about";

export interface UiState {
  view: ViewId;
  setView: (v: ViewId) => void;


  defaultAlgos: Algo[];
  setDefaultAlgos: (a: Algo[]) => void;


  theme: "system" | "light" | "dark";
  setTheme: (t: "system" | "light" | "dark") => void;

  density: "comfortable" | "compact";
  setDensity: (d: "comfortable" | "compact") => void;
}

export const useUiStore = create<UiState>((set) => ({
  view: "hash",
  setView: (view) => set({ view }),
  defaultAlgos: ["sha256", "blake3"],
  setDefaultAlgos: (defaultAlgos) => set({ defaultAlgos }),
  theme: "system",
  setTheme: (theme) => set({ theme }),
  density: "comfortable",
  setDensity: (density) => set({ density }),
}));
