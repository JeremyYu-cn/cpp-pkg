export type VersionPolicy =
  | "default-branch"
  | "latest-prerelease"
  | "latest-release";

export type ManifestDependencyHooks = {
  postinstall?: string | string[];
};

export type GetPkgOptions = {
  httpProxy?: string;
  httpsProxy?: string;
  githubToken?: string;
  giteeToken?: string;
  gitlabToken?: string;
  bitbucketToken?: string;
  cache?: boolean;
  offline?: boolean;
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
  binary?: {
    platform?: string;
    arch?: string;
    pattern?: string;
  } | string | true;
  hooks?: ManifestDependencyHooks;
  transitive?: boolean;
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
      | "bitbucket-release"
      | "bitbucket-repository"
      | "gitee-release"
      | "gitee-repository"
      | "github-release"
      | "github-repository"
      | "gitlab-release"
      | "gitlab-repository";
    archiveName: string;
    archiveUrl: string;
    integrity?: {
      sha256: string;
    };
    requested?: SourceRequest;
  };
  install: {
    mode: "binary" | "full-project" | "include";
    target: string;
    headers: string[];
    paths: string[];
  };
  transitiveDeps?: string[];
};

export type InstalledDependenciesFile = {
  dependencies: InstalledDependency[];
};
