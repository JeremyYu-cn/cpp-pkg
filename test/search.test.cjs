const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

function clearDistCache() {
  for (const cachePath of Object.keys(require.cache)) {
    if (cachePath.includes(`${path.sep}dist${path.sep}`)) {
      delete require.cache[cachePath];
    }
  }
}

function createMockAxios(data) {
  const calls = [];
  const mockAxios = async (url, config = {}) => {
    calls.push({ config, url });

    return { data };
  };

  mockAxios.calls = calls;
  return mockAxios;
}

async function withMockedAxios(data, callback) {
  const axiosPath = require.resolve("axios");
  const previousAxios = require.cache[axiosPath];
  const previousGitHubToken = process.env.GITHUB_TOKEN;
  const previousGhToken = process.env.GH_TOKEN;
  const mockAxios = createMockAxios(data);

  clearDistCache();
  delete process.env.GITHUB_TOKEN;
  delete process.env.GH_TOKEN;
  require.cache[axiosPath] = {
    children: [],
    exports: mockAxios,
    filename: axiosPath,
    id: axiosPath,
    loaded: true,
    paths: module.paths,
  };

  try {
    await callback(mockAxios);
  } finally {
    clearDistCache();

    if (previousAxios) {
      require.cache[axiosPath] = previousAxios;
    } else {
      delete require.cache[axiosPath];
    }

    if (previousGitHubToken === undefined) {
      delete process.env.GITHUB_TOKEN;
    } else {
      process.env.GITHUB_TOKEN = previousGitHubToken;
    }

    if (previousGhToken === undefined) {
      delete process.env.GH_TOKEN;
    } else {
      process.env.GH_TOKEN = previousGhToken;
    }
  }
}

test("searchGitHubPackages searches C++ repositories sorted by stars", async () => {
  await withMockedAxios(
    {
      items: [
        {
          archived: false,
          default_branch: "main",
          description: "Fast JSON parser",
          disabled: false,
          fork: false,
          full_name: "Tencent/rapidjson",
          html_url: "https://github.com/Tencent/rapidjson",
          language: "C++",
          name: "rapidjson",
          pushed_at: "2026-04-26T00:00:00Z",
          stargazers_count: 14000,
        },
        {
          archived: false,
          default_branch: "develop",
          description: "JSON for Modern C++",
          disabled: false,
          fork: false,
          full_name: "nlohmann/json",
          html_url: "https://github.com/nlohmann/json",
          language: "C++",
          name: "json",
          pushed_at: "2026-04-27T00:00:00Z",
          stargazers_count: 47000,
        },
        {
          archived: true,
          default_branch: "main",
          description: "Archived result",
          disabled: false,
          fork: false,
          full_name: "owner/archived",
          html_url: "https://github.com/owner/archived",
          language: "C++",
          name: "archived",
          pushed_at: "2025-01-01T00:00:00Z",
          stargazers_count: 999999,
        },
      ],
      total_count: 3,
    },
    async (mockAxios) => {
      const {
        formatSearchResults,
        searchGitHubPackages,
      } = require("../dist/tools/search.js");

      const results = await searchGitHubPackages("json parser", {
        limit: 2,
      });

      assert.equal(
        mockAxios.calls[0].url,
        "https://api.github.com/search/repositories",
      );
      assert.deepEqual(mockAxios.calls[0].config.params, {
        order: "desc",
        per_page: 2,
        q: "json parser language:C++ fork:false archived:false",
        sort: "stars",
      });
      assert.deepEqual(
        results.map((result) => result.repositoryPath),
        ["/nlohmann/json", "/Tencent/rapidjson"],
      );
      assert.equal(results[0].repositoryUrl, "https://github.com/nlohmann/json");
      assert.deepEqual(formatSearchResults(results).map((row) => row.stars), [
        "47k",
        "14k",
      ]);
    },
  );
});

test("normalizeSearchLimit rejects invalid limits and caps large values", () => {
  const { normalizeSearchLimit } = require("../dist/tools/search.js");

  assert.equal(normalizeSearchLimit(5), 5);
  assert.equal(normalizeSearchLimit(100), 50);
  assert.throws(
    () => normalizeSearchLimit(0),
    /Search limit must be a positive integer/,
  );
});
