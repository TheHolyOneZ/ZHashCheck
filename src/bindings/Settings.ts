
import type { Algo } from "./Algo";

export type Settings = { defaultAlgos: Array<Algo>, theme: string, density: string, threadCount: number | null, followSymlinks: boolean, includeHidden: boolean, historyRetentionDays: number, };
