
import type { Algo } from "./Algo";
import type { DuplicateGroup } from "./DuplicateGroup";

export type DedupReport = { roots: Array<string>, algo: Algo, groups: Array<DuplicateGroup>, totalFilesScanned: bigint, totalWastedBytes: bigint, };
