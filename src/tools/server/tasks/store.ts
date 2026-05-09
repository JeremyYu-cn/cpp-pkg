import type { PackageServerState } from "../types";
import { withLoggerSink } from "../../logger";
import {
  getErrorMessage,
  getTimestamp,
  stripAnsi,
  toSnapshot,
} from "./format";
import type {
  PackageTaskEvent,
  PackageTaskRecord,
  PackageTaskSnapshot,
  PackageTaskSubscriber,
} from "./types";

const MAX_TASKS = 50;
const MAX_TASK_LOGS = 500;
const tasks = new Map<string, PackageTaskRecord>();
const queue: PackageTaskRecord[] = [];
const subscribers = new Set<PackageTaskSubscriber>();

let nextTaskId = 1;
let taskIsRunning = false;

function getSnapshots() {
  return [...tasks.values()]
    .map(toSnapshot)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function publish(event: PackageTaskEvent) {
  for (const subscriber of subscribers) {
    subscriber(event);
  }
}

function emitTask(task: PackageTaskRecord) {
  publish({
    task: toSnapshot(task),
    type: "task",
  });
}

function appendTaskLog(
  task: PackageTaskRecord,
  message: string,
  stream: "stderr" | "stdout" = "stdout",
) {
  task.logs.push({
    id: task.logs.length + 1,
    message: stripAnsi(message),
    stream,
    timestamp: getTimestamp(),
  });

  if (task.logs.length > MAX_TASK_LOGS) {
    task.logs.splice(0, task.logs.length - MAX_TASK_LOGS);
  }

  emitTask(task);
}

function compactTasks() {
  const retainedIds = new Set(
    getSnapshots().slice(0, MAX_TASKS).map((task) => task.id),
  );

  for (const taskId of tasks.keys()) {
    if (!retainedIds.has(taskId)) {
      tasks.delete(taskId);
    }
  }
}

async function runTask(task: PackageTaskRecord) {
  task.status = "running";
  task.startedAt = getTimestamp();
  appendTaskLog(task, `Started ${task.label}.`);

  try {
    task.result = await withLoggerSink(
      (line, stream) => appendTaskLog(task, line, stream),
      task.run,
    );
    task.status = "succeeded";
    task.finishedAt = getTimestamp();
    appendTaskLog(task, `Finished ${task.label}.`);
  } catch (error: unknown) {
    task.status = "failed";
    task.error = getErrorMessage(error);
    task.finishedAt = getTimestamp();
    appendTaskLog(task, task.error, "stderr");
  }

  emitTask(task);
  compactTasks();
}

async function runQueuedTasks() {
  if (taskIsRunning) {
    return;
  }

  taskIsRunning = true;

  try {
    while (queue.length) {
      const task = queue.shift()!;

      if (task.status !== "canceled") {
        await runTask(task);
      }
    }
  } finally {
    taskIsRunning = false;
  }
}

export function enqueuePackageTask(
  type: string,
  label: string,
  run: () => Promise<PackageServerState>,
) {
  const task: PackageTaskRecord = {
    createdAt: getTimestamp(),
    id: String(nextTaskId++),
    label,
    logs: [],
    run,
    status: "queued",
    type,
  };

  tasks.set(task.id, task);
  queue.push(task);
  appendTaskLog(task, `Queued ${label}.`);
  void runQueuedTasks();

  return toSnapshot(task);
}

export function cancelPackageTask(taskId: string) {
  const task = tasks.get(taskId);

  if (!task) {
    return null;
  }

  if (task.status !== "queued") {
    return toSnapshot(task);
  }

  task.status = "canceled";
  task.finishedAt = getTimestamp();
  appendTaskLog(task, `Canceled ${task.label}.`);

  return toSnapshot(task);
}

export function getPackageTasks() {
  return getSnapshots();
}

export function subscribeToPackageTasks(subscriber: PackageTaskSubscriber) {
  subscribers.add(subscriber);
  subscriber({
    tasks: getSnapshots(),
    type: "snapshot",
  });

  return () => {
    subscribers.delete(subscriber);
  };
}
