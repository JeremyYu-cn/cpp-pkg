import type { ConfigEntry } from "../../../public/config";

export type ServerConfigEntry = ConfigEntry & {
  secret: boolean;
};

export type ServerConfigState = {
  configFilePath: string;
  entries: ServerConfigEntry[];
};
