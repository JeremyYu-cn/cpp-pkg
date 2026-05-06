export type IncludeDelimiter = "<" | "\"";

export type InspectPackageStatus = "declared" | "installed" | "missing";

export type IncludeUsage = {
  delimiter: IncludeDelimiter;
  filePath: string;
  includePath: string;
  line: number;
};

export type InspectedPackage = {
  includes: string[];
  name: string;
  status: InspectPackageStatus;
  usages: IncludeUsage[];
};

export type ProjectInspection = {
  filesScanned: number;
  includeCount: number;
  packages: InspectedPackage[];
};
