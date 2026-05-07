import { test } from "vitest";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const cliPath = path.resolve(process.cwd(), "dist/main.js");

async function withTempDir(callback: TempDirCallback) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cppkg-compiler-test-"));

  try {
    await callback(tempDir);
  } finally {
    await fs.rm(tempDir, { force: true, recursive: true });
  }
}

function runCli(args: string[], cwd: string) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: "utf8",
  });
}

test("compile dry-run prints a host compiler command with cppkg includes", async () => {
  await withTempDir(async (cwd) => {
    await fs.mkdir(path.join(cwd, "src"), { recursive: true });
    await fs.writeFile(path.join(cwd, "src", "main.cpp"), "int main() { return 0; }\n");

    const result = runCli(
      [
        "compile",
        "src/main.cpp",
        "--compiler",
        "clang++",
        "--std",
        "c++23",
        "-o",
        "bin/app",
        "--dry-run",
      ],
      cwd,
    );

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Dry run/);
    assert.match(
      result.stdout,
      /clang\+\+ -I cpp_libs\/include -std=c\+\+23 src\/main\.cpp -o bin\/app/,
    );
  });
});

test("compile dry-run can wrap the compiler command in Docker", async () => {
  await withTempDir(async (cwd) => {
    await fs.mkdir(path.join(cwd, "src"), { recursive: true });
    await fs.writeFile(path.join(cwd, "src", "main.cpp"), "int main() { return 0; }\n");

    const result = runCli(
      [
        "compile",
        "src/main.cpp",
        "--docker",
        "--docker-image",
        "cppkg-build:test",
        "--dry-run",
      ],
      cwd,
    );

    assert.equal(result.status, 0);
    assert.match(result.stdout, /docker run --rm/);
    assert.match(result.stdout, /cppkg-build:test c\+\+/);
    assert.match(result.stdout, /-I \/workspace\/cpp_libs\/include/);
    assert.match(result.stdout, /\/workspace\/src\/main\.cpp/);
  });
});

test("build dry-run prints CMake configure and build commands", async () => {
  await withTempDir(async (cwd) => {
    const result = runCli(
      [
        "build",
        "--release",
        "--target",
        "app",
        "--build-dir",
        "out/build",
        "--dry-run",
      ],
      cwd,
    );

    assert.equal(result.status, 0);
    assert.match(result.stdout, /cmake -S \. -B out\/build/);
    assert.match(result.stdout, /-DCMAKE_BUILD_TYPE=Release/);
    assert.match(result.stdout, /-DCPPKG_GLOBAL_INCLUDE_DIRECTORIES=ON/);
    assert.match(result.stdout, /cmake --build out\/build --config Release --target app/);
  });
});

test("build dry-run can run CMake through Docker", async () => {
  await withTempDir(async (cwd) => {
    const result = runCli(
      [
        "build",
        "--docker",
        "--docker-image",
        "cppkg-build:test",
        "--dry-run",
      ],
      cwd,
    );

    assert.equal(result.status, 0);
    assert.match(result.stdout, /docker run --rm/);
    assert.match(result.stdout, /cppkg-build:test cmake -S \/workspace -B \/workspace\/build/);
    assert.match(
      result.stdout,
      /-DCMAKE_PROJECT_TOP_LEVEL_INCLUDES=\/workspace\/cppkg\.cmake/,
    );
  });
});

test("compiler command lists built-in Docker compiler profiles", async () => {
  await withTempDir(async (cwd) => {
    const result = runCli(["compiler", "list"], cwd);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /gcc-13/);
    assert.match(result.stdout, /gcc:13/);
    assert.match(result.stdout, /clang-18/);
    assert.match(result.stdout, /silkeh\/clang:18/);
  });
});

test("compiler install dry-run prints the Docker pull command", async () => {
  await withTempDir(async (cwd) => {
    const result = runCli(["compiler", "install", "gcc-13", "--dry-run"], cwd);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Dry run/);
    assert.match(result.stdout, /docker pull gcc:13/);
  });
});

test("compiler add can set a default Docker profile used by compile", async () => {
  await withTempDir(async (cwd) => {
    await fs.mkdir(path.join(cwd, "src"), { recursive: true });
    await fs.writeFile(path.join(cwd, "src", "main.cpp"), "int main() { return 0; }\n");

    const added = runCli(
      [
        "compiler",
        "add",
        "project-clang",
        "--kind",
        "clang",
        "--compiler-version",
        "18",
        "--docker-image",
        "cppkg-clang:18",
        "--set-default",
      ],
      cwd,
    );
    const toolchains = JSON.parse(
      await fs.readFile(path.join(cwd, "cppkg-toolchains.json"), "utf8"),
    );
    const compiled = runCli(
      ["compile", "src/main.cpp", "--dry-run"],
      cwd,
    );

    assert.equal(added.status, 0);
    assert.equal(toolchains.default, "project-clang");
    assert.equal(toolchains.profiles["project-clang"].compiler, "clang++");
    assert.equal(toolchains.profiles["project-clang"].dockerImage, "cppkg-clang:18");
    assert.equal(compiled.status, 0);
    assert.match(compiled.stdout, /docker run --rm/);
    assert.match(compiled.stdout, /cppkg-clang:18 clang\+\+/);
    assert.match(compiled.stdout, /\/workspace\/src\/main\.cpp/);
  });
});

test("build dry-run can use a named compiler profile", async () => {
  await withTempDir(async (cwd) => {
    const added = runCli(
      [
        "compiler",
        "add",
        "gcc-test",
        "--kind",
        "gcc",
        "--compiler-version",
        "14",
        "--docker-image",
        "cppkg-gcc:14",
      ],
      cwd,
    );
    const result = runCli(
      ["build", "--toolchain", "gcc-test", "--dry-run"],
      cwd,
    );

    assert.equal(added.status, 0);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /cppkg-gcc:14 cmake -S \/workspace/);
    assert.match(result.stdout, /-DCMAKE_CXX_COMPILER=g\+\+/);
  });
});
