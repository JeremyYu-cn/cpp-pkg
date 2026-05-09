import type {
  PackageTaskRecord,
  PackageTaskSnapshot,
} from "./types";

export function getTimestamp() {
  return new Date().toISOString();
}

export function stripAnsi(value: string) {
  return value.replace(/\x1B\[[0-?]*[ -/]*[@-~]/gu, "");
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function toSnapshot(
  task: PackageTaskRecord,
): PackageTaskSnapshot {
  const snapshot: PackageTaskSnapshot = {
    createdAt: task.createdAt,
    id: task.id,
    label: task.label,
    logs: [...task.logs],
    status: task.status,
    type: task.type,
  };

  if (task.startedAt) {
    snapshot.startedAt = task.startedAt;
  }

  if (task.finishedAt) {
    snapshot.finishedAt = task.finishedAt;
  }

  if (task.error) {
    snapshot.error = task.error;
  }

  if (task.result) {
    snapshot.result = task.result;
  }

  return snapshot;
}
