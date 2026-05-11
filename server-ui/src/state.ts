import { DEFAULT_CONFIG_STATE, DEFAULT_STATE } from "./constants";
import type {
  ConfigEntry,
  ConfigState,
  PackageTask,
  ProjectStatus,
  ProjectStatusIssue,
  ServerState,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeServerState(value: unknown): ServerState {
  const record = isRecord(value) ? value : {};
  const manifest = isRecord(record.manifest) ? record.manifest : {};

  return {
    cwd: typeof record.cwd === "string" ? record.cwd : DEFAULT_STATE.cwd,
    installed: Array.isArray(record.installed)
      ? record.installed as ServerState["installed"]
      : [],
    manifest: {
      dependencies: Array.isArray(manifest.dependencies)
        ? manifest.dependencies as ServerState["manifest"]["dependencies"]
        : [],
      ...(typeof manifest.error === "string"
        ? { error: manifest.error }
        : {}),
    },
    packageRoot: typeof record.packageRoot === "string"
      ? record.packageRoot
      : DEFAULT_STATE.packageRoot,
  };
}

export function normalizePackageTask(value: unknown): PackageTask | null {
  if (!isRecord(value)) {
    return null;
  }

  const logs = Array.isArray(value.logs)
    ? value.logs as PackageTask["logs"]
    : [];
  const status = typeof value.status === "string" ? value.status : "queued";
  const task: PackageTask = {
    createdAt: typeof value.createdAt === "string"
      ? value.createdAt
      : new Date().toISOString(),
    id: typeof value.id === "string" ? value.id : "",
    label: typeof value.label === "string" ? value.label : "Task",
    logs,
    status: status as PackageTask["status"],
    type: typeof value.type === "string" ? value.type : "unknown",
  };

  if (typeof value.error === "string") {
    task.error = value.error;
  }

  if (typeof value.finishedAt === "string") {
    task.finishedAt = value.finishedAt;
  }

  if (typeof value.startedAt === "string") {
    task.startedAt = value.startedAt;
  }

  if (value.result !== undefined) {
    task.result = normalizeServerState(value.result);
  }

  return task;
}

function normalizeConfigEntry(value: unknown): ConfigEntry | null {
  if (!isRecord(value) || typeof value.key !== "string") {
    return null;
  }

  const source = value.source === "user" ? "user" : "default";

  return {
    key: value.key,
    secret: value.secret === true,
    source,
    value: typeof value.value === "string" ? value.value : "",
  };
}

export function normalizeConfigState(value: unknown): ConfigState {
  const record = isRecord(value) ? value : {};

  return {
    configFilePath: typeof record.configFilePath === "string"
      ? record.configFilePath
      : DEFAULT_CONFIG_STATE.configFilePath,
    entries: Array.isArray(record.entries)
      ? record.entries.flatMap((entry) => {
        const normalized = normalizeConfigEntry(entry);

        return normalized ? [normalized] : [];
      })
      : [],
  };
}

function normalizeProjectStatusIssue(value: unknown): ProjectStatusIssue | null {
  if (!isRecord(value)) {
    return null;
  }

  const severity = value.severity === "error" ? "error" : "warn";

  return {
    code: typeof value.code === "string" ? value.code : "unknown",
    message: typeof value.message === "string" ? value.message : "",
    packageName: typeof value.packageName === "string"
      ? value.packageName
      : "",
    severity,
  };
}

export function normalizeProjectStatus(value: unknown): ProjectStatus {
  const record = isRecord(value) ? value : {};

  return {
    issues: Array.isArray(record.issues)
      ? record.issues.flatMap((issue) => {
        const normalized = normalizeProjectStatusIssue(issue);

        return normalized ? [normalized] : [];
      })
      : [],
  };
}
