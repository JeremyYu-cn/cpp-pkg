import { test } from "vitest";
import assert from "node:assert/strict";

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

test("normalizePackageDownloadJobs validates and caps package task concurrency", () => {
  const {
    normalizePackageDownloadJobs,
  } = require("../dist/tools/download/tasks.js");

  assert.equal(normalizePackageDownloadJobs(undefined, 10), 4);
  assert.equal(normalizePackageDownloadJobs("2", 10), 2);
  assert.equal(normalizePackageDownloadJobs(8, 3), 3);
  assert.throws(
    () => normalizePackageDownloadJobs("0", 3),
    /Option --jobs must be a positive integer/,
  );
});

test("runPackageDownloadTasks limits concurrent work and preserves task results", async () => {
  const {
    runPackageDownloadTasks,
  } = require("../dist/tools/download/tasks.js");
  let activeTasks = 0;
  let maxActiveTasks = 0;

  const tasks = Array.from({ length: 5 }, (_, index) => ({
    item: index,
    label: `pkg-${index}`,
    run: async () => {
      activeTasks += 1;
      maxActiveTasks = Math.max(maxActiveTasks, activeTasks);
      await delay(5);
      activeTasks -= 1;

      return index * 2;
    },
  }));

  const results = await runPackageDownloadTasks(tasks, { jobs: 2 });

  assert.equal(maxActiveTasks, 2);
  assert.deepEqual(
    results.map((result: { status: string }) => result.status),
    ["fulfilled", "fulfilled", "fulfilled", "fulfilled", "fulfilled"],
  );
  assert.deepEqual(
    results.map((result: { status: string; value?: number }) =>
      result.status === "fulfilled" ? result.value : null,
    ),
    [0, 2, 4, 6, 8],
  );
});

test("runPackageDownloadTasks records failures without stopping other tasks", async () => {
  const {
    getRejectedPackageDownloadTasks,
    runPackageDownloadTasks,
  } = require("../dist/tools/download/tasks.js");
  const completed: string[] = [];

  const results = await runPackageDownloadTasks(
    [
      {
        item: "ok-1",
        label: "ok-1",
        run: () => {
          completed.push("ok-1");
        },
      },
      {
        item: "bad",
        label: "bad",
        run: () => {
          throw new Error("boom");
        },
      },
      {
        item: "ok-2",
        label: "ok-2",
        run: () => {
          completed.push("ok-2");
        },
      },
    ],
    { jobs: 2 },
  );
  const failures = getRejectedPackageDownloadTasks(results);

  assert.deepEqual(completed.sort(), ["ok-1", "ok-2"]);
  assert.equal(failures.length, 1);
  assert.equal(failures[0].item, "bad");
  assert.match(String(failures[0].reason), /boom/);
});
