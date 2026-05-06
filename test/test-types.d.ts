type TempDirCallback = (cwd: string) => Promise<void> | void;

type TestRequestedSource = {
  includePrerelease?: boolean;
  type: string;
  value: string | null;
};

type TestInstallMetadata = {
  headers: string[];
  mode: "include" | "full-project";
  paths: string[];
  target: string;
};

type TestDependency = {
  install: TestInstallMetadata;
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
    integrity?: {
      sha256: string;
    };
    requested?: TestRequestedSource;
    type: string;
  };
  type: string;
  version: string;
};

type TestAxiosConfig = {
  headers: Record<string, string>;
  params: Record<string, boolean | number | string>;
  [key: string]: unknown;
};

type TestAxiosCall = {
  config: TestAxiosConfig;
  url: string;
};

type TestAxiosRouteValue =
  | Buffer
  | boolean
  | null
  | number
  | Record<string, unknown>
  | Record<string, unknown>[]
  | string;

type TestAxiosRoute =
  | TestAxiosRouteValue
  | ((url: string, config: TestAxiosConfig) => TestAxiosRouteValue);

type TestAxiosRoutes = Record<string, TestAxiosRoute>;

type TestMockAxiosResponse = {
  data: unknown;
  headers: Record<string, string>;
};

type TestMockAxios = {
  (url: string, config?: Partial<TestAxiosConfig>): Promise<TestMockAxiosResponse>;
  calls: TestAxiosCall[];
};
