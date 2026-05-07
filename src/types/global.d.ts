export type VersionPolicy =
  | "default-branch"
  | "latest-prerelease"
  | "latest-release";

export type GetPkgOptions = {
  httpProxy?: string;
  httpsProxy?: string;
  githubToken?: string;
  giteeToken?: string;
  cache?: boolean;
  fullProject?: boolean;
  tag?: string;
  branch?: string;
  versionPolicy?: VersionPolicy;
  versionRange?: string;
  prerelease?: boolean;
  includePath?: string | string[];
  stripPrefix?: string;
  patches?: string[];
  components?: string[];
  checksum?: string;
};

export type SourceRequest = {
  type:
    | "archive-url"
    | "branch"
    | "default-branch"
    | "latest-release"
    | "tag"
    | "version-range";
  value: string | null;
  includePrerelease?: boolean;
  includePath?: string[];
  stripPrefix?: string;
  patches?: string[];
  components?: string[];
  checksum?: string;
};

export type InstalledDependency = {
  name: string;
  version: string;
  installedAt: string;
  type: "header-only" | "need-compile";
  repository: {
    path: string;
    url: string;
  };
  release: {
    tagName: string | null;
    name: string | null;
    publishedAt: string | null;
  };
  source: {
    type:
      | "archive-url"
      | "gitee-release"
      | "gitee-repository"
      | "github-release"
      | "github-repository";
    archiveName: string;
    archiveUrl: string;
    integrity?: {
      sha256: string;
    };
    requested?: SourceRequest;
  };
  install: {
    mode: "include" | "full-project";
    target: string;
    headers: string[];
    paths: string[];
  };
};

export type InstalledDependenciesFile = {
  dependencies: InstalledDependency[];
};
