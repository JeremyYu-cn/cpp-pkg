import { test } from "vitest";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

type CommandDoc = {
  children?: CommandDoc[];
  command: string;
  options?: Array<{ flags: string }>;
  path: string;
};

function flattenCommands(commands: CommandDoc[]): CommandDoc[] {
  return commands.flatMap((command) => [
    command,
    ...flattenCommands(command.children ?? []),
  ]);
}

test("generated command metadata covers the CLI commands", async () => {
  const contents = await fs.readFile(
    path.resolve("docs/commands.json"),
    "utf8",
  );
  const reference = JSON.parse(contents) as {
    commands: CommandDoc[];
    version: string;
  };
  const commands = flattenCommands(reference.commands);
  const commandPaths = new Set(commands.map((command) => command.path));

  assert.equal(typeof reference.version, "string");
  assert.notEqual(reference.version, "");

  for (const command of [
    "add",
    "build",
    "cache",
    "cache clean",
    "cache list",
    "cmake",
    "compile",
    "compiler",
    "compiler add",
    "compiler current",
    "compiler install",
    "compiler list",
    "compiler remove",
    "compiler use",
    "config",
    "config get",
    "config list",
    "config remove",
    "config set",
    "get",
    "init",
    "inspect",
    "install",
    "list",
    "remove",
    "search",
    "status",
    "update",
  ]) {
    assert.ok(commandPaths.has(command), `missing ${command}`);
  }

  assert.ok(
    commands
      .find((command) => command.path === "compiler install")
      ?.options?.some((option) => option.flags === "--dry-run"),
  );
});

test("GitHub Pages static assets are present", async () => {
  for (const file of [
    "docs/.nojekyll",
    "docs/assets/icon.png",
    "docs/assets/main.css",
    "docs/assets/main.js",
    "docs/index.html",
    "docs/zh-CN.html",
  ]) {
    await fs.access(path.resolve(file));
  }
});
