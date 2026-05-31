
import type { Algo } from "./Algo";


export type FileHashes = {


hashes: { [key in Algo]?: string }, bytes: bigint, tookMs: bigint, };
