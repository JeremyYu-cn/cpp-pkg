import type { ConfigState, ServerState } from "./types";

export const DEFAULT_STATE: ServerState = {
  cwd: "",
  installed: [],
  manifest: {
    dependencies: [],
  },
  packageRoot: "",
};

export const DEFAULT_CONFIG_STATE: ConfigState = {
  configFilePath: "cppkg.config.json",
  entries: [],
};

export const LANGUAGE_OPTIONS = [
  { label: "C++", value: "C++" },
  { label: "C", value: "C" },
  { label: "CMake", value: "CMake" },
];

export const VERSION_POLICIES = [
  { label: "Latest release", value: "latest-release" },
  { label: "Latest prerelease", value: "latest-prerelease" },
  { label: "Default branch", value: "default-branch" },
];

export const CONFIG_KEY_OPTIONS = [
  { label: "proxy", value: "proxy" },
  { label: "httpProxy", value: "httpProxy" },
  { label: "httpsProxy", value: "httpsProxy" },
  { label: "githubToken", value: "githubToken" },
  { label: "giteeToken", value: "giteeToken" },
  { label: "packageRootDir", value: "packageRootDir" },
  { label: "includeDirName", value: "includeDirName" },
  { label: "projectsDirName", value: "projectsDirName" },
  { label: "cacheDirName", value: "cacheDirName" },
  { label: "depsFileName", value: "depsFileName" },
];
