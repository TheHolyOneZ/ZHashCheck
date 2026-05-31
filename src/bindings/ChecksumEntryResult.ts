
import type { Algo } from "./Algo";
import type { VerifyOutcome } from "./VerifyOutcome";

export type ChecksumEntryResult = { path: string, algo: Algo, expected: string, outcome: VerifyOutcome, computed: string | null, };
