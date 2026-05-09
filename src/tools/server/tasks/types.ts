import type { PackageServerState } from "../types";

export type PackageTaskStatus =
  | "canceled"
  | "failed"
  | "queued"
  | "running"
  | "succeeded";

export type PackageTaskLog = {
  id: number;
  message: string;
  stream: "stderr" | "stdout";
  timestamp: string;
};

export type PackageTaskSnapshot = {
  createdAt: string;
  finishedAt?: string;
  id: string;
  label: string;
  logs: PackageTaskLog[];
  result?: PackageServerState;
  startedAt?: string;
  status: PackageTaskStatus;
  type: string;
  error?: string;
};

export type PackageTaskRecord = PackageTaskSnapshot & {
  run: () => Promise<PackageServerState>;
};

export type PackageTaskEvent =
  | {
      task: PackageTaskSnapshot;
      type: "task";
    }
  | {
      tasks: PackageTaskSnapshot[];
      type: "snapshot";
    };

export type PackageTaskSubscriber = (event: PackageTaskEvent) => void;
