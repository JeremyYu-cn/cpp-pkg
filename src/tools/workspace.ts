import fs from "node:fs";
import path from "node:path";

export const WORKSPACE_FILE_NAME = "cppkg-workspace.json";

export type WorkspaceConfig = {
  packages: string[];
};

function findWorkspaceFile(startDir: string): string | null {
  let currentDir = path.resolve(startDir);
  const root = path.parse(currentDir).root;

  while (true) {
    const configPath = path.join(currentDir, WORKSPACE_FILE_NAME);

    if (fs.existsSync(configPath)) {
      return configPath;
    }

    if (currentDir === root) {
      return null;
    }

    currentDir = path.dirname(currentDir);
  }
}

/**
 * Looks for cppkg-workspace.json in the current directory or parent directories.
 * If found, reads the packages array and returns the list of workspace member directories.
 */
export function resolveWorkspace(): WorkspaceConfig | null {
  const configPath = findWorkspaceFile(process.cwd());

  if (!configPath) {
    return null;
  }

  const content = fs.readFileSync(configPath, "utf8");
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`${WORKSPACE_FILE_NAME} contains invalid JSON.`);
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${WORKSPACE_FILE_NAME} must be a JSON object.`);
  }

  const config = parsed as Record<string, unknown>;

  if (!("packages" in config)) {
    throw new Error(`${WORKSPACE_FILE_NAME} must define a "packages" array.`);
  }

  if (!Array.isArray(config.packages)) {
    throw new Error(`${WORKSPACE_FILE_NAME} "packages" must be an array.`);
  }

  const packages = config.packages.map((entry, index) => {
    if (typeof entry !== "string" || !entry.trim()) {
      throw new Error(
        `${WORKSPACE_FILE_NAME} packages[${index}] must be a non-empty string.`,
      );
    }

    return entry.trim();
  });

  const configDir = path.dirname(configPath);

  return {
    packages: packages.map((pkg) => {
      if (path.isAbsolute(pkg)) {
        return path.resolve(pkg);
      }

      return path.resolve(configDir, pkg);
    }),
  };
}

/**
 * Creates a cppkg-workspace.json file with the given member paths.
 */
export function createWorkspaceConfig(packages: string[]): {
  config: WorkspaceConfig;
  configPath: string;
} {
  const configPath = path.resolve(process.cwd(), WORKSPACE_FILE_NAME);

  if (fs.existsSync(configPath)) {
    throw new Error(`${WORKSPACE_FILE_NAME} already exists.`);
  }

  const config: WorkspaceConfig = {
    packages,
  };

  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

  return { config, configPath };
}
