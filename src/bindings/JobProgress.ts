

export type JobProgress = { id: string, filesDone: bigint, filesTotal: bigint, bytesDone: bigint, bytesTotal: bigint, throughputBps: bigint, etaS: bigint | null, };
