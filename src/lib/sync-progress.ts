export type SyncProgress = {
  status: "idle" | "running" | "done" | "error";
  current: number;
  total: number;
  message: string;
};

const jobs = new Map<string, SyncProgress>();

export function getProgress(accountName: string): SyncProgress {
  return (
    jobs.get(accountName) ?? {
      status: "idle",
      current: 0,
      total: 0,
      message: "Not started",
    }
  );
}

export function setProgress(accountName: string, progress: SyncProgress) {
  jobs.set(accountName, progress);
}
