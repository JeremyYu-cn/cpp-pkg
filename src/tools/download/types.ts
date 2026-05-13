import type { GitHubRelease } from "../../types/github";
import type { InstalledDependency } from "../../types/global";

export type GitHubReleaseAsset = GitHubRelease["assets"][number];

export type GitHubRepository = {
  default_branch: string;
  full_name: string;
  html_url: string;
};

export type GiteeRelease = {
  name: string | null;
  published_at?: string | null;
  prerelease: boolean;
  tag_name: string | null;
};

export type GiteeRepository = {
  default_branch: string;
  full_name: string;
  html_url: string;
};

export type GitLabRelease = {
  name: string | null;
  released_at?: string | null;
  tag_name: string | null;
  upcoming_release: boolean;
};

export type GitLabRepository = {
  default_branch: string;
  path_with_namespace: string;
  web_url: string;
};

export type BitbucketRelease = {
  name: string | null;
  published_at?: string | null;
  tag_name: string | null;
};

export type BitbucketRepository = {
  mainbranch: { name: string } | null;
  full_name: string;
  links: { html: { href: string } };
};

export type ProviderRelease = GitHubRelease | GiteeRelease | GitLabRelease | BitbucketRelease;

export type ArchiveDescriptor = {
  headers?: Record<string, string>;
  kind: InstalledDependency["source"]["type"];
  label: string;
  url: string;
};

export type PreparedArchive = {
  archive: ArchiveDescriptor;
  includeDirs: string[];
  integrity: {
    sha256: string;
  };
  sourceRootPath: string;
};

export type ResolvedGitHubRepositoryInput = {
  kind: "github-repository";
  packageName: string;
  projectInstallDirName: string;
  repositoryPath: string;
  repositoryUrl: string;
};

export type ResolvedGiteeRepositoryInput = {
  kind: "gitee-repository";
  packageName: string;
  projectInstallDirName: string;
  repositoryPath: string;
  repositoryUrl: string;
};

export type ResolvedGitLabRepositoryInput = {
  kind: "gitlab-repository";
  packageName: string;
  projectInstallDirName: string;
  repositoryPath: string;
  repositoryUrl: string;
};

export type ResolvedBitbucketRepositoryInput = {
  kind: "bitbucket-repository";
  packageName: string;
  projectInstallDirName: string;
  repositoryPath: string;
  repositoryUrl: string;
};

export type ResolvedArchiveURLInput = {
  archive: ArchiveDescriptor;
  kind: "archive-url";
  packageName: string;
  projectInstallDirName: string;
  repositoryPath: string;
  repositoryUrl: string;
};

export type ResolvedInputSource =
  | ResolvedArchiveURLInput
  | ResolvedBitbucketRepositoryInput
  | ResolvedGiteeRepositoryInput
  | ResolvedGitHubRepositoryInput
  | ResolvedGitLabRepositoryInput;
