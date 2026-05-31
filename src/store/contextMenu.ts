// Copyright (c) 2026 TheHolyOneZ


import { create } from "zustand";

export interface MenuItem {
  type?: "item";
  label: string;
  onSelect: () => void | Promise<void>;
  danger?: boolean;
  disabled?: boolean;
  hint?: string;
}
export interface MenuSeparator {
  type: "separator";
}
export type MenuEntry = MenuItem | MenuSeparator;

interface State {
  open: boolean;
  x: number;
  y: number;
  items: MenuEntry[];
  openAt: (x: number, y: number, items: MenuEntry[]) => void;
  close: () => void;
}

export const useContextMenuStore = create<State>((set) => ({
  open: false,
  x: 0,
  y: 0,
  items: [],
  openAt: (x, y, items) => set({ open: true, x, y, items }),
  close: () => set({ open: false }),
}));
