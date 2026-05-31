
import type { Algo } from "./Algo";
import type { PairedEntry } from "./PairedEntry";
import type { SoloEntry } from "./SoloEntry";

export type CompareReport = { rootA: string, rootB: string, algo: Algo, identical: Array<PairedEntry>, differ: Array<PairedEntry>, onlyA: Array<SoloEntry>, onlyB: Array<SoloEntry>,


sizeDiffer: Array<PairedEntry>, };
