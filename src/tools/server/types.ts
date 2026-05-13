import type { GetPkgOptions, InstalledDependency } from "../../types/global";
import type { ManifestDependency } from "../../public/manifest";

export type PackageServerOptions = Pick<
  GetPkgOptions,
  "httpProxy" | "httpsProxy"
> & {
  host: string;
  port: number;
};

export type JsonRecord = Record<string, unknown>;

export type PackageServerManifestState = {
  dependencies: ManifestDependency[];
  error?: string;
};

export type PackageServerState = {
  cwd: string;
  packageRoot: string;
  installed: InstalledDependency[];
  manifest: PackageServerManifestState;
};

export type OutdatedPackageInfo = {
  currentVersion: string;
  latestVersion?: string;
  name: string;
  outdated: boolean;
  error?: string;
};
