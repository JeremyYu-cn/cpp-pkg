const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildInstalledDependency,
} = require("../dist/tools/download/metadata.js");

const repositorySource = {
  kind: "github-repository",
  packageName: "json",
  projectInstallDirName: "nlohmann_json",
  repositoryPath: "/nlohmann/json",
  repositoryUrl: "https://github.com/nlohmann/json",
};

const archiveSource = {
  archive: {
    kind: "archive-url",
    label: "sdk.zip",
    url: "https://example.com/sdk.zip",
  },
  kind: "archive-url",
  packageName: "sdk",
  projectInstallDirName: "example.com_sdk",
  repositoryPath: "https://example.com/sdk.zip",
  repositoryUrl: "https://example.com/sdk.zip",
};

const release = {
  name: "JSON for Modern C++ version 3.12.0",
  published_at: "2025-04-11T08:43:39Z",
  tag_name: "v3.12.0",
};

test("buildInstalledDependency records explicit tag requests", () => {
  const dependency = buildInstalledDependency(
    repositorySource,
    "cpp_libs/include",
    release,
    {
      kind: "github-release",
      label: "include.zip",
      url: "https://github.com/nlohmann/json/releases/download/v3.12.0/include.zip",
    },
    ["nlohmann"],
    ["nlohmann"],
    "header-only",
    "include",
    { tag: "v3.12.0" },
  );

  assert.equal(dependency.version, "v3.12.0");
  assert.deepEqual(dependency.source.requested, {
    type: "tag",
    value: "v3.12.0",
  });
  assert.deepEqual(dependency.release, {
    tagName: "v3.12.0",
    name: "JSON for Modern C++ version 3.12.0",
    publishedAt: "2025-04-11T08:43:39Z",
  });
});

test("buildInstalledDependency records branch requests", () => {
  const dependency = buildInstalledDependency(
    repositorySource,
    "cpp_libs/include",
    null,
    {
      kind: "github-repository",
      label: "develop.zip",
      url: "https://api.github.com/repos/nlohmann/json/zipball/develop",
    },
    ["nlohmann"],
    ["nlohmann"],
    "header-only",
    "include",
    { branch: "develop" },
  );

  assert.equal(dependency.version, "develop");
  assert.deepEqual(dependency.source.requested, {
    type: "branch",
    value: "develop",
  });
});

test("buildInstalledDependency records latest release prerelease intent", () => {
  const dependency = buildInstalledDependency(
    repositorySource,
    "cpp_libs/include",
    release,
    {
      kind: "github-release",
      label: "include.zip",
      url: "https://github.com/nlohmann/json/releases/download/v3.12.0/include.zip",
    },
    ["nlohmann"],
    ["nlohmann"],
    "header-only",
    "include",
    { prerelease: true },
  );

  assert.deepEqual(dependency.source.requested, {
    type: "latest-release",
    value: null,
    includePrerelease: true,
  });
});

test("buildInstalledDependency records archive URL requests", () => {
  const dependency = buildInstalledDependency(
    archiveSource,
    "cpp_libs/projects/example.com_sdk",
    null,
    archiveSource.archive,
    ["include"],
    ["include"],
    "need-compile",
    "full-project",
  );

  assert.equal(dependency.version, "sdk");
  assert.deepEqual(dependency.source.requested, {
    type: "archive-url",
    value: "https://example.com/sdk.zip",
  });
});
