import path from "node:path";
import {
  CONFIG_FILE_NAME,
  getConfigFilePath,
  listConfigEntries,
} from "../../../public/config";
import type { ConfigKey } from "../../../public/config";
import type { ServerConfigEntry, ServerConfigState } from "./types";

const SECRET_CONFIG_KEYS = new Set<ConfigKey>(["githubToken", "giteeToken"]);
const REDACTED_VALUE = "<redacted>";

function redactConfigEntry(entry: ServerConfigEntry): ServerConfigEntry {
  if (!entry.secret || !entry.value) {
    return entry;
  }

  return {
    ...entry,
    value: REDACTED_VALUE,
  };
}

export function isSecretConfigKey(key: ConfigKey) {
  return SECRET_CONFIG_KEYS.has(key);
}

export function readConfigState(): ServerConfigState {
  const configFilePath =
    path.relative(process.cwd(), getConfigFilePath()) || CONFIG_FILE_NAME;

  return {
    configFilePath,
    entries: listConfigEntries().map((entry) =>
      redactConfigEntry({
        ...entry,
        secret: isSecretConfigKey(entry.key),
      }),
    ),
  };
}
