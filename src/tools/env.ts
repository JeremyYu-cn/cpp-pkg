import { execSync } from "node:child_process";
import os from "node:os";

export type EnvDiagnostic = {
  key: string;
  value: string;
};

function tryExec(command: string): string {
  try {
    const result = execSync(command, { encoding: "utf8", timeout: 5000 });
    return result?.toString().trim().split("\n")[0]?.trim() ?? "not found";
  } catch {
    return "not found";
  }
}

export function getSystemDiagnostics(): EnvDiagnostic[] {
  const diagnostics: EnvDiagnostic[] = [];

  diagnostics.push({ key: "Platform", value: os.platform() });
  diagnostics.push({ key: "Architecture", value: os.arch() });
  diagnostics.push({ key: "OS Release", value: os.release() });
  diagnostics.push({ key: "Node.js Version", value: process.version });
  diagnostics.push({ key: "CWD", value: process.cwd() });

  const cxx = tryExec("which g++ 2>/dev/null || which clang++ 2>/dev/null || echo not found");
  diagnostics.push({ key: "C++ Compiler", value: cxx });

  const cc = tryExec("which gcc 2>/dev/null || which clang 2>/dev/null || echo not found");
  diagnostics.push({ key: "C Compiler", value: cc });

  const cmake = tryExec("cmake --version 2>/dev/null | head -1 || echo not found");
  diagnostics.push({ key: "CMake", value: cmake });

  const make = tryExec("make --version 2>/dev/null | head -1 || echo not found");
  diagnostics.push({ key: "Make", value: make });

  const git = tryExec("git --version 2>/dev/null || echo not found");
  diagnostics.push({ key: "Git", value: git });

  const pkgConfig = tryExec("pkg-config --version 2>/dev/null || echo not found");
  diagnostics.push({ key: "pkg-config", value: pkgConfig });

  const python3 = tryExec("python3 --version 2>/dev/null || python --version 2>/dev/null || echo not found");
  diagnostics.push({ key: "Python", value: python3 });

  const curl = tryExec("curl --version 2>/dev/null | head -1 || echo not found");
  diagnostics.push({ key: "curl", value: curl });

  diagnostics.push({ key: "CPU Cores", value: String(os.cpus().length) });
  diagnostics.push({ key: "Total Memory", value: `${Math.round(os.totalmem() / 1024 / 1024 / 1024)} GB` });
  diagnostics.push({ key: "Free Memory", value: `${Math.round(os.freemem() / 1024 / 1024 / 1024)} GB` });

  return diagnostics;
}
