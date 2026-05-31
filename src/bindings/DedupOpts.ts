
import type { Algo } from "./Algo";

export type DedupOpts = { algo: Algo, followSymlinks: boolean, includeHidden: boolean, minSize: bigint | null, maxSize: bigint | null, };
