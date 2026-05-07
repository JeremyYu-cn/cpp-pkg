import path from "node:path";
import { resolvePublicIncludePath } from "../../public/packagePath";
import {
  DEFAULT_CPP_STANDARD,
  DEFAULT_DOCKER_WORKDIR,
  type ProjectPathMode,
} from "./types";

export function normalizeCommand(
  value: string | undefined,
  fallback: string,
  label: string,
) {
  const normalized = value?.trim() || fallback;

  if (!normalized) {
    throw new Error(`${label} cannot be empty.`);
  }

  return normalized;
}

export function normalizeStringOption(value: string | undefined, label: string) {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${label} cannot be empty.`);
  }

  return normalized;
}

export function normalizeStringList(values: string[] | undefined, label: string) {
  return (values ?? []).map((value, index) =>
    normalizeStringOption(value, `${label}[${index}]`)!,
  );
}

export function normalizeProjectRelativePath(value: string, label: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`${label} cannot be empty.`);
  }

  const projectRoot = process.cwd();
  const resolvedPath = path.isAbsolute(trimmed)
    ? path.resolve(trimmed)
    : path.resolve(projectRoot, trimmed);
  const relativePath = path.relative(projectRoot, resolvedPath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`${label} must stay inside the current project.`);
  }

  return {
    absolutePath: resolvedPath,
    relativePath: relativePath.replace(/\\/g, "/") || ".",
  };
}

export function toProjectPath(
  value: string,
  label: string,
  mode: ProjectPathMode,
) {
  const projectPath = normalizeProjectRelativePath(value, label);

  if (mode === "container") {
    return projectPath.relativePath === "."
      ? DEFAULT_DOCKER_WORKDIR
      : `${DEFAULT_DOCKER_WORKDIR}/${projectPath.relativePath}`;
  }

  return projectPath.relativePath;
}

export function getDefaultIncludeDir(mode: ProjectPathMode) {
  return toProjectPath(resolvePublicIncludePath(), "include directory", mode);
}

export function getStandardFlag(std: string | undefined) {
  const standard = normalizeCommand(std, DEFAULT_CPP_STANDARD, "Option --std");

  return standard.startsWith("-std=") ? standard : `-std=${standard}`;
}

export function getCMakeStandard(std: string | undefined) {
  if (!std) {
    return undefined;
  }

  const normalized = normalizeStringOption(std, "Option --std")!;
  const match = /^(?:c\+\+)?(\d+)$/iu.exec(normalized);

  if (!match) {
    throw new Error("Option --std must look like c++20 or 20 for CMake builds.");
  }

  return match[1]!;
}
