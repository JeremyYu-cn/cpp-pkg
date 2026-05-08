import type { ServerState } from "./types";

export const DEFAULT_STATE: ServerState = {
  cwd: "",
  installed: [],
  manifest: {
    dependencies: [],
  },
  packageRoot: "",
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
