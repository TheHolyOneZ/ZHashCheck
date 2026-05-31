
import type { Algo } from "./Algo";
import type { DuplicateFile } from "./DuplicateFile";

export type DuplicateGroup = { hash: string, algo: Algo, sizeEach: bigint, files: Array<DuplicateFile>,


wastedBytes: bigint, };
