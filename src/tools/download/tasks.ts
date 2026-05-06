import { logger } from "../logger";

export const DEFAULT_PACKAGE_DOWNLOAD_JOBS = 4;

export type PackageDownloadTaskOptions = {
  jobs?: number | string;
};

export type PackageDownloadTask<TItem, TValue = void> = {
  item: TItem;
  label: string;
  run: () => Promise<TValue> | TValue;
};

export type PackageDownloadTaskFulfilled<TItem, TValue = void> = {
  index: number;
  item: TItem;
  label: string;
  status: "fulfilled";
  value: TValue;
};

export type PackageDownloadTaskRejected<TItem> = {
  index: number;
  item: TItem;
  label: string;
  reason: unknown;
  status: "rejected";
};

export type PackageDownloadTaskResult<TItem, TValue = void> =
  | PackageDownloadTaskFulfilled<TItem, TValue>
  | PackageDownloadTaskRejected<TItem>;

/**
 * Normalizes the package-level concurrency used by batch install/update commands.
 */
export function normalizePackageDownloadJobs(
  value: number | string | undefined,
  taskCount = Number.POSITIVE_INFINITY,
) {
  const rawValue = value === undefined ? DEFAULT_PACKAGE_DOWNLOAD_JOBS : value;
  const jobs = typeof rawValue === "string" ? Number(rawValue.trim()) : rawValue;

  if (!Number.isInteger(jobs) || jobs < 1) {
    throw new Error("Option --jobs must be a positive integer.");
  }

  if (taskCount <= 0) {
    return jobs;
  }

  return Math.min(jobs, taskCount);
}

export function getRejectedPackageDownloadTasks<TItem, TValue>(
  results: PackageDownloadTaskResult<TItem, TValue>[],
) {
  return results.filter(
    (result): result is PackageDownloadTaskRejected<TItem> =>
      result.status === "rejected",
  );
}

/**
 * Runs package download/install tasks with a bounded concurrency limit.
 */
export async function runPackageDownloadTasks<TItem, TValue = void>(
  tasks: PackageDownloadTask<TItem, TValue>[],
  options: PackageDownloadTaskOptions = {},
) {
  const taskCount = tasks.length;

  if (!taskCount) {
    return [] as PackageDownloadTaskResult<TItem, TValue>[];
  }

  const jobs = normalizePackageDownloadJobs(options.jobs, taskCount);
  const results = new Array<PackageDownloadTaskResult<TItem, TValue> | undefined>(
    taskCount,
  );
  let nextTaskIndex = 0;

  async function runWorker() {
    while (nextTaskIndex < taskCount) {
      const index = nextTaskIndex;
      nextTaskIndex += 1;

      const task = tasks[index]!;
      logger.step(index + 1, taskCount, `Installing ${task.label}`);

      try {
        const value = await task.run();

        results[index] = {
          index,
          item: task.item,
          label: task.label,
          status: "fulfilled",
          value,
        };
      } catch (reason: unknown) {
        results[index] = {
          index,
          item: task.item,
          label: task.label,
          reason,
          status: "rejected",
        };
      }
    }
  }

  await Promise.all(Array.from({ length: jobs }, () => runWorker()));

  return results.map((result, index) => {
    if (result) {
      return result;
    }

    const task = tasks[index]!;

    return {
      index,
      item: task.item,
      label: task.label,
      reason: new Error(`Package task did not complete: ${task.label}`),
      status: "rejected",
    } satisfies PackageDownloadTaskRejected<TItem>;
  });
}
