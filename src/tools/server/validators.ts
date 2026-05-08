import type { AddManifestDependencyOptions } from "../../public/manifest";
import type { GetPkgOptions } from "../../types/global";
import { HttpError } from "./errors";
import type { JsonRecord, PackageServerOptions } from "./types";

export function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readString(value: unknown, label: string) {
  if (typeof value !== "string") {
    throw new HttpError(400, `${label} must be a string.`);
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new HttpError(400, `${label} cannot be empty.`);
  }

  return normalized;
}

export function readOptionalString(record: JsonRecord, key: string) {
  const value = record[key];

  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return readString(value, key);
}

export function readOptionalBoolean(record: JsonRecord, key: string) {
  const value = record[key];

  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new HttpError(400, `${key} must be a boolean.`);
  }

  return value;
}

export function readOptionalStringList(record: JsonRecord, key: string) {
  const value = record[key];

  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "string") {
    return value
      .split("\n")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  if (!Array.isArray(value)) {
    throw new HttpError(400, `${key} must be a string or array of strings.`);
  }

  return value.map((entry, index) => readString(entry, `${key}[${index}]`));
}

export function readInstallOptions(
  record: JsonRecord,
  defaults: PackageServerOptions,
) {
  const options: GetPkgOptions = {};
  const cache = readOptionalBoolean(record, "cache");

  if (defaults.httpProxy) {
    options.httpProxy = defaults.httpProxy;
  }

  if (defaults.httpsProxy) {
    options.httpsProxy = defaults.httpsProxy;
  }

  if (cache !== undefined) {
    options.cache = cache;
  }

  for (const key of [
    "branch",
    "checksum",
    "stripPrefix",
    "tag",
    "versionPolicy",
    "versionRange",
  ] as const) {
    const value = readOptionalString(record, key);

    if (value !== undefined) {
      options[key] = value as never;
    }
  }

  for (const key of ["components", "includePath", "patches"] as const) {
    const value = readOptionalStringList(record, key);

    if (value?.length) {
      options[key] = value as never;
    }
  }

  for (const key of ["fullProject", "prerelease"] as const) {
    const value = readOptionalBoolean(record, key);

    if (value !== undefined) {
      options[key] = value;
    }
  }

  return options;
}

export function readManifestAddOptions(record: JsonRecord) {
  const options: AddManifestDependencyOptions = {};

  for (const key of [
    "branch",
    "checksum",
    "name",
    "stripPrefix",
    "tag",
    "versionPolicy",
    "versionRange",
  ] as const) {
    const value = readOptionalString(record, key);

    if (value !== undefined) {
      options[key] = value as never;
    }
  }

  for (const key of ["components", "includePath", "patches"] as const) {
    const value = readOptionalStringList(record, key);

    if (value?.length) {
      options[key] = value;
    }
  }

  for (const key of ["force", "fullProject", "prerelease"] as const) {
    const value = readOptionalBoolean(record, key);

    if (value !== undefined) {
      options[key] = value;
    }
  }

  return options;
}

export function getSearchLimit(value: string | null) {
  if (!value) {
    return 10;
  }

  const limit = Number(value);

  if (!Number.isInteger(limit) || limit < 1) {
    throw new HttpError(400, "limit must be a positive integer.");
  }

  return limit;
}
