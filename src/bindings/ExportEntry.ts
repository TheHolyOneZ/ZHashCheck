
import type { Algo } from "./Algo";

export type ExportEntry = { path: string, bytes: number, hashes: { [key in Algo]?: string }, };
