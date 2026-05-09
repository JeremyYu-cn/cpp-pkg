export type SourceRequest = {
  type: string;
  value: string | null;
  includePrerelease?: boolean;
};

export type InstalledDependency = {
  install: {
    headers: string[];
    mode: "include" | "full-project";
    paths: string[];
    target: string;
  };
  installedAt: string;
  name: string;
  release: {
    name: string | null;
    publishedAt: string | null;
    tagName: string | null;
  };
  repository: {
    path: string;
    url: string;
  };
  source: {
    archiveName: string;
    archiveUrl: string;
    requested?: SourceRequest;
    type: string;
  };
  type: "header-only" | "need-compile";
  version: string;
};

export type ManifestDependency = {
  branch?: string;
  fullProject?: boolean;
  name?: string;
  source: string;
  tag?: string;
  versionPolicy?: string;
  versionRange?: string;
};

export type ServerState = {
  cwd: string;
  installed: InstalledDependency[];
  manifest: {
    dependencies: ManifestDependency[];
    error?: string;
  };
  packageRoot: string;
};

export type PackageTaskStatus =
  | "canceled"
  | "failed"
  | "queued"
  | "running"
  | "succeeded";

export type PackageTaskLog = {
  id: number;
  message: string;
  stream: "stderr" | "stdout";
  timestamp: string;
};

export type PackageTask = {
  createdAt: string;
  error?: string;
  finishedAt?: string;
  id: string;
  label: string;
  logs: PackageTaskLog[];
  result?: ServerState;
  startedAt?: string;
  status: PackageTaskStatus;
  type: string;
};

export type ConfigEntry = {
  key: string;
  secret: boolean;
  source: "default" | "user";
  value: string;
};

export type ConfigState = {
  configFilePath: string;
  entries: ConfigEntry[];
};

export type SearchResult = {
  defaultBranch: string | null;
  description: string;
  language: string | null;
  name: string;
  repositoryPath: string;
  repositoryUrl: string;
  stars: number;
  updatedAt: string | null;
};

export type PackageActionValues = {
  addToManifest?: boolean;
  branch?: string;
  checksum?: string;
  components?: string;
  force?: boolean;
  fullProject?: boolean;
  includePath?: string;
  install?: boolean;
  name?: string;
  noCache?: boolean;
  patches?: string;
  prerelease?: boolean;
  source?: string;
  stripPrefix?: string;
  tag?: string;
  versionPolicy?: string;
  versionRange?: string;
};

export type SearchValues = {
  language: string;
  limit: number;
  query: string;
};

export type ConfigFormValues = {
  key: string;
  value: string;
};

export type SourceFormSuggestion = {
  branch?: string;
  kind: "archive-url" | "gitee-repository" | "github-repository";
  name: string;
  source: string;
  tag?: string;
};
