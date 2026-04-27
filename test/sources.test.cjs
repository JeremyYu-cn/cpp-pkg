const test = require("node:test");
const assert = require("node:assert/strict");

const {
  pickGiteeReleaseArchive,
  pickGiteeRepositoryArchive,
  pickGitHubReleaseArchive,
  pickGitHubRepositoryArchive,
  resolveInputSource,
} = require("../dist/tools/download/sources.js");

test("resolveInputSource normalizes GitHub repository URLs", () => {
  assert.deepEqual(resolveInputSource("https://github.com/nlohmann/json.git"), {
    kind: "github-repository",
    packageName: "json",
    projectInstallDirName: "nlohmann_json",
    repositoryPath: "/nlohmann/json",
    repositoryUrl: "https://github.com/nlohmann/json",
  });

  assert.equal(
    resolveInputSource("https://api.github.com/repos/fmtlib/fmt").repositoryPath,
    "/fmtlib/fmt",
  );
});

test("resolveInputSource normalizes Gitee repository URLs", () => {
  assert.deepEqual(resolveInputSource("https://gitee.com/mirrors/jsoncpp.git"), {
    kind: "gitee-repository",
    packageName: "jsoncpp",
    projectInstallDirName: "mirrors_jsoncpp",
    repositoryPath: "/mirrors/jsoncpp",
    repositoryUrl: "https://gitee.com/mirrors/jsoncpp.git",
  });

  assert.equal(
    resolveInputSource("https://gitee.com/api/v5/repos/mirrors/jsoncpp")
      .repositoryPath,
    "/mirrors/jsoncpp",
  );
});

test("resolveInputSource treats non-repository URLs as archive URLs", () => {
  const source = resolveInputSource(
    "https://example.com/downloads/vendor sdk.zip?build=1",
  );

  assert.equal(source.kind, "archive-url");
  assert.equal(source.packageName, "vendor sdk");
  assert.equal(source.repositoryPath, "https://example.com/downloads/vendor%20sdk.zip?build=1");
  assert.equal(source.archive.label, "vendor sdk.zip");
  assert.equal(source.projectInstallDirName, "example.com_downloads_vendor_20sdk_build_1");
});

test("repository archive descriptors use the requested ref when provided", () => {
  assert.deepEqual(
    pickGitHubRepositoryArchive("/owner/repo", {
      default_branch: "main",
      full_name: "owner/repo",
      html_url: "https://github.com/owner/repo",
    }, "feature/test"),
    {
      kind: "github-repository",
      label: "feature/test.zip",
      url: "https://api.github.com/repos/owner/repo/zipball/feature%2Ftest",
    },
  );

  assert.deepEqual(
    pickGiteeRepositoryArchive("/owner/repo", {
      default_branch: "master",
      full_name: "owner/repo",
      html_url: "https://gitee.com/owner/repo",
    }, "release/v1"),
    {
      kind: "gitee-repository",
      label: "release/v1.zip",
      url: "https://gitee.com/owner/repo/repository/archive/release%2Fv1.zip",
    },
  );
});

test("release archive descriptors prefer downloadable GitHub zip assets", () => {
  assert.deepEqual(
    pickGitHubReleaseArchive({
      assets: [
        {
          browser_download_url: "https://github.com/owner/repo/releases/download/v1/pkg.zip",
          content_type: "application/zip",
          name: "pkg.zip",
        },
      ],
      name: "Release 1",
      tag_name: "v1",
      zipball_url: "https://api.github.com/repos/owner/repo/zipball/v1",
    }),
    {
      kind: "github-release",
      label: "pkg.zip",
      url: "https://github.com/owner/repo/releases/download/v1/pkg.zip",
    },
  );
});

test("release archive descriptors fall back to provider source archives", () => {
  assert.deepEqual(
    pickGitHubReleaseArchive({
      assets: [],
      name: "Release 1",
      tag_name: "v1",
      zipball_url: "https://api.github.com/repos/owner/repo/zipball/v1",
    }),
    {
      kind: "github-release",
      label: "v1.zip",
      url: "https://api.github.com/repos/owner/repo/zipball/v1",
    },
  );

  assert.deepEqual(
    pickGiteeReleaseArchive("/owner/repo", {
      name: "Release 1",
      prerelease: false,
      tag_name: "v1",
    }),
    {
      kind: "gitee-release",
      label: "v1.zip",
      url: "https://gitee.com/owner/repo/repository/archive/v1.zip",
    },
  );
});
