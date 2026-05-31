
import type { Algo } from "./Algo";
import type { VerifyOutcome } from "./VerifyOutcome";

export type PasteVerify = { algo: Algo, outcome: VerifyOutcome, computed: string, expected: string, };
