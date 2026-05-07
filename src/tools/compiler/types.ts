export const DEFAULT_CPP_COMPILER = "c++";
export const DEFAULT_CPP_STANDARD = "c++20";
export const DEFAULT_DOCKER_IMAGE = "gcc:latest";
export const DEFAULT_DOCKER_WORKDIR = "/workspace";

export type CompilerEnvironmentOptions = {
  docker?: boolean;
  dockerImage?: string;
  dryRun?: boolean;
  toolchain?: string;
};

export type CompileSourcesOptions = CompilerEnvironmentOptions & {
  compiler?: string;
  compilerArg?: string[];
  includeDir?: string[];
  output?: string;
  std?: string;
};

export type BuildCMakeProjectOptions = CompilerEnvironmentOptions & {
  buildArg?: string[];
  buildDir?: string;
  cmakeArg?: string[];
  compiler?: string;
  config?: string;
  cppkgCmake?: boolean;
  generator?: string;
  release?: boolean;
  std?: string;
  target?: string;
};

export type PlannedCommand = {
  args: string[];
  command: string;
  cwd: string;
};

export type ProjectPathMode = "container" | "host";
