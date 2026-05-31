
import type { Algo } from "./Algo";

export type HistoryEntry = { id: bigint, path: string, bytes: bigint, createdAt: bigint, hashes: { [key in Algo]?: string }, pinned: boolean, };
