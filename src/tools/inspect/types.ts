export type IncludeDelimiter = "<" | "\"";

export type InspectPackageStatus = "declared" | "installed" | "missing";

export type PackageRecommendation = {
  name: string;
  reason: string;
  source: string;
};

export type IncludeUsage = {
  delimiter: IncludeDelimiter;
  filePath: string;
  includePath: string;
  line: number;
};

export type InspectedPackage = {
  includes: string[];
  name: string;
  recommendation?: PackageRecommendation;
  status: InspectPackageStatus;
  usages: IncludeUsage[];
};

export type ProjectInspection = {
  filesScanned: number;
  includeCount: number;
  packages: InspectedPackage[];
};
