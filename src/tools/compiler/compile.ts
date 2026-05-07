import { promises as fsp } from "node:fs";
import path from "node:path";
import { dockerizeCommand } from "./docker";
import {
  getDefaultIncludeDir,
  getStandardFlag,
  normalizeCommand,
  normalizeProjectRelativePath,
  normalizeStringList,
  toProjectPath,
} from "./paths";
import { runPlannedCommands } from "./runner";
import { applyCompileToolchain } from "./toolchain";
import {
  DEFAULT_CPP_COMPILER,
  type CompileSourcesOptions,
  type ProjectPathMode,
} from "./types";

export function planCompileSources(
  files: string[],
  options: CompileSourcesOptions = {},
) {
  if (!files.length) {
    throw new Error("At least one source file is required.");
  }

  const mode: ProjectPathMode = options.docker ? "container" : "host";
  const compiler = normalizeCommand(
    options.compiler,
    DEFAULT_CPP_COMPILER,
    "Option --compiler",
  );
  const output = toProjectPath(options.output || "a.out", "output path", mode);
  const includeDirs = [
    getDefaultIncludeDir(mode),
    ...normalizeStringList(options.includeDir, "include directory").map(
      (includeDir) => toProjectPath(includeDir, "include directory", mode),
    ),
  ];
  const args = [
    ...includeDirs.flatMap((includeDir) => ["-I", includeDir]),
    getStandardFlag(options.std),
    ...files.map((file, index) =>
      toProjectPath(file, `source file ${index + 1}`, mode),
    ),
    "-o",
    output,
    ...normalizeStringList(options.compilerArg, "compiler argument"),
  ];

  return [
    dockerizeCommand(compiler, args, options),
  ];
}

async function ensureOutputDirectory(output: string | undefined) {
  const outputPath = normalizeProjectRelativePath(output || "a.out", "output path")
    .absolutePath;
  const outputDirectory = path.dirname(outputPath);

  if (outputDirectory !== process.cwd()) {
    await fsp.mkdir(outputDirectory, { recursive: true });
  }
}

export async function compileSources(
  files: string[],
  options: CompileSourcesOptions = {},
) {
  const resolvedOptions = await applyCompileToolchain(options);
  const commands = planCompileSources(files, resolvedOptions);

  if (!resolvedOptions.dryRun) {
    await ensureOutputDirectory(resolvedOptions.output);
  }

  await runPlannedCommands(commands, resolvedOptions);

  return commands;
}
