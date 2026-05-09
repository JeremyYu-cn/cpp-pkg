import { useEffect, useState } from "react";
import {
  cancelTask,
  fetchTasks,
  runPackageAction,
} from "../api";
import type {
  PackageActionValues,
  PackageTask,
  ServerState,
} from "../types";
import { normalizeServerState } from "../state";

type UsePackageTasksOptions = {
  onError: (message: string) => void;
  onQueued: () => void;
  onStateUpdate: (state: ServerState) => void;
};

function sortTasks(tasks: PackageTask[]) {
  return [...tasks].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}

export default function usePackageTasks({
  onError,
  onQueued,
  onStateUpdate,
}: UsePackageTasksOptions) {
  const [startingTask, setStartingTask] = useState(false);
  const [tasks, setTasks] = useState<PackageTask[]>([]);

  const applyTask = (task: PackageTask) => {
    setTasks((currentTasks) => {
      const byId = new Map(currentTasks.map((item) => [item.id, item]));

      byId.set(task.id, task);

      return sortTasks([...byId.values()]);
    });

    if (task.status === "succeeded" && task.result) {
      onStateUpdate(normalizeServerState(task.result));
    }
  };

  useEffect(() => {
    void fetchTasks()
      .then((nextTasks) => {
        setTasks(sortTasks(nextTasks));

        for (const task of nextTasks) {
          if (task.status === "succeeded" && task.result) {
            onStateUpdate(normalizeServerState(task.result));
          }
        }
      })
      .catch((error: unknown) => {
        onError(error instanceof Error ? error.message : String(error));
      });

    const events = new EventSource("/api/tasks/events");

    events.addEventListener("snapshot", (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as {
        tasks: PackageTask[];
      };

      setTasks(sortTasks(payload.tasks));

      for (const task of payload.tasks) {
        if (task.status === "succeeded" && task.result) {
          onStateUpdate(normalizeServerState(task.result));
        }
      }
    });

    events.addEventListener("task", (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as {
        task: PackageTask;
      };

      applyTask(payload.task);
    });

    events.onerror = () => {
      events.close();
    };

    return () => events.close();
  }, []);

  const startPackageTask = async (
    values: PackageActionValues,
    source?: string,
  ) => {
    setStartingTask(true);

    try {
      const { task } = await runPackageAction(values, source);

      applyTask(task);
      onQueued();
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    } finally {
      setStartingTask(false);
    }
  };

  const cancelQueuedTask = async (taskId: string) => {
    try {
      const { task } = await cancelTask(taskId);

      applyTask(task);
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  };

  return {
    cancelQueuedTask,
    startPackageTask,
    startingTask,
    tasks,
  };
}
