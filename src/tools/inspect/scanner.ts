import type { IncludeDelimiter, IncludeUsage } from "./types";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { normalizeTrackedPath } from "../deps";
import {
  STANDARD_HEADERS,
  SYSTEM_INCLUDE_PREFIXES,
} from "./constants";
import {
  isSourceFile,
  normalizeIncludePath,
  shouldSkipDirectory,
} from "./path";

export async function collectSourceFiles(
  directoryPath: string,
  packageRootPath: string,
): Promise<string[]> {
  const files: string[] = [];
  const entries = await fsp.readdir(directoryPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      if (!shouldSkipDirectory(entry.name, entryPath, packageRootPath)) {
        files.push(...await collectSourceFiles(entryPath, packageRootPath));
      }

      continue;
    }

    if (entry.isFile() && isSourceFile(entryPath)) {
      files.push(entryPath);
    }
  }

  return files.sort();
}

function stripComments(
  line: string,
  inBlockComment: boolean,
): { inBlockComment: boolean; line: string } {
  let index = 0;
  let stripped = "";
  let blockCommentOpen = inBlockComment;

  while (index < line.length) {
    if (blockCommentOpen) {
      const endIndex = line.indexOf("*/", index);

      if (endIndex === -1) {
        return { inBlockComment: true, line: stripped };
      }

      blockCommentOpen = false;
      index = endIndex + 2;
      continue;
    }

    const nextBlockIndex = line.indexOf("/*", index);
    const nextLineIndex = line.indexOf("//", index);

    if (
      nextLineIndex !== -1 &&
      (nextBlockIndex === -1 || nextLineIndex < nextBlockIndex)
    ) {
      stripped += line.slice(index, nextLineIndex);
      break;
    }

    if (nextBlockIndex !== -1) {
      stripped += line.slice(index, nextBlockIndex);
      blockCommentOpen = true;
      index = nextBlockIndex + 2;
      continue;
    }

    stripped += line.slice(index);
    break;
  }

  return { inBlockComment: blockCommentOpen, line: stripped };
}

export async function readIncludeUsages(
  filePath: string,
  projectRootPath: string,
) {
  const content = await fsp.readFile(filePath, "utf8");
  const usages: IncludeUsage[] = [];
  const lines = content.split(/\r?\n/u);
  let inBlockComment = false;

  for (const [index, rawLine] of lines.entries()) {
    const stripped = stripComments(rawLine, inBlockComment);
    inBlockComment = stripped.inBlockComment;

    const match = /^\s*#\s*include\s*([<"])([^>"]+)[>"]/u.exec(
      stripped.line,
    );

    if (!match) {
      continue;
    }

    usages.push({
      delimiter: match[1] as IncludeDelimiter,
      filePath: path.relative(projectRootPath, filePath) || path.basename(filePath),
      includePath: normalizeIncludePath(match[2]!),
      line: index + 1,
    });
  }

  return usages;
}

export function isStandardOrSystemInclude(includePath: string) {
  const normalized = normalizeIncludePath(includePath);

  return STANDARD_HEADERS.has(normalized) ||
    SYSTEM_INCLUDE_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function isProjectLocalInclude(
  usage: IncludeUsage,
  sourceFilePath: string,
  projectRootPath: string,
  projectFileSet: Set<string>,
  projectFileBasenames: Set<string>,
) {
  const includePath = normalizeIncludePath(usage.includePath);
  const relativeToSource = normalizeTrackedPath(
    path.relative(
      projectRootPath,
      path.resolve(path.dirname(sourceFilePath), includePath),
    ),
  );

  if (projectFileSet.has(relativeToSource) || projectFileSet.has(includePath)) {
    return true;
  }

  return usage.delimiter === "\"" &&
    !includePath.includes("/") &&
    projectFileBasenames.has(includePath);
}

export function getPackageCandidateName(includePath: string) {
  const normalized = normalizeIncludePath(includePath);
  const firstSegment = normalized.split("/").filter(Boolean)[0];

  if (!firstSegment) {
    return "";
  }

  if (normalized.includes("/")) {
    return firstSegment;
  }

  return firstSegment.replace(/\.(?:h|hh|hpp|hxx|ipp|inl)$/iu, "");
}
