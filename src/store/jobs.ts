// Copyright (c) 2026 TheHolyOneZ


import { create } from "zustand";
import type { Algo } from "@/bindings/Algo";

export interface HashRow {
  id: string;
  path: string;
  bytes: number;
  hashes: Record<Algo, string>;
  tookMs: number;
  copied?: Algo | null;
  error?: string;
}

export interface JobsState {

  currentJobId: string | null;
  setCurrentJobId: (id: string | null) => void;


  filesDone: number;
  filesTotal: number;
  bytesDone: number;
  bytesTotal: number;
  throughputBps: number;
  etaS: number | null;
  setProgress: (p: Partial<Omit<JobsState, "setProgress" | "reset" | "appendRow" | "rows" | "currentJobId" | "setCurrentJobId" | "setRunning" | "running" | "clearRows">>) => void;


  rows: HashRow[];
  appendRow: (r: HashRow) => void;
  clearRows: () => void;

  running: boolean;
  setRunning: (r: boolean) => void;

  reset: () => void;
}

export const useJobsStore = create<JobsState>((set) => ({
  currentJobId: null,
  setCurrentJobId: (currentJobId) => set({ currentJobId }),

  filesDone: 0,
  filesTotal: 0,
  bytesDone: 0,
  bytesTotal: 0,
  throughputBps: 0,
  etaS: null,
  setProgress: (p) => set((s) => ({ ...s, ...p })),

  rows: [],
  appendRow: (r) => set((s) => ({ rows: [r, ...s.rows] })),
  clearRows: () => set({ rows: [] }),

  running: false,
  setRunning: (running) => set({ running }),

  reset: () => set({
    currentJobId: null,
    filesDone: 0,
    filesTotal: 0,
    bytesDone: 0,
    bytesTotal: 0,
    throughputBps: 0,
    etaS: null,
    running: false,
  }),
}));
