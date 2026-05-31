
import type { ChecksumEntryResult } from "./ChecksumEntryResult";
import type { ChecksumKind } from "./ChecksumKind";

export type ChecksumFileReport = { kind: ChecksumKind, entries: Array<ChecksumEntryResult>, passed: number, failed: number, missing: number, };
