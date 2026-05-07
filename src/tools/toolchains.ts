import { spawn } from "node:child_process";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { logger } from "./logger";

export const COMPILER_PROFILES_FILE_NAME = "cppkg-toolchains.json";

export type CompilerKind = "clang" | "custom" | "gcc";

export type CompilerProfile = {
  cmakeCompiler?: string;
  compiler: string;
  docker?: boolean;
  dockerImage?: string;
  kind: CompilerKind;
  version?: string;
};

export type CompilerProfileEntry = {
  default: boolean;
  name: string;
  profile: CompilerProfile;
  source: "builtin" | "project";
};

export type AddCompilerProfileOptions = {
  cmakeCompiler?: string;
  compiler?: string;
  docker?: boolean;
  dockerImage?: string;
  host?: boolean;
  kind?: string;
  setDefault?: boolean;
  version?: string;
};

export type InstallCompilerProfileOptions = {
  dockerImage?: string;
  dryRun?: boolean;
  setDefault?: boolean;
};

type CompilerProfilesFile = {
  default?: string;
  profiles: Record<string, CompilerProfile>;
};

const EMPTY_PROFILES_FILE: CompilerProfilesFile = {
  profiles: {},
};

const BUILTIN_COMPILER_PROFILES: Record<string, CompilerProfile> = {
  "clang-17": {
    cmakeCompiler: "clang++",
    compiler: "clang++",
    docker: true,
    dockerImage: "silkeh/clang:17",
    kind: "clang",
    version: "17",
  },
  "clang-18": {
    cmakeCompiler: "clang++",
    compiler: "clang++",
    docker: true,
    dockerImage: "silkeh/clang:18",
    kind: "clang",
    version: "18",
  },
  "clang-latest": {
    cmakeCompiler: "clang++",
    compiler: "clang++",
    docker: true,
    dockerImage: "silkeh/clang:latest",
    kind: "clang",
    version: "latest",
  },
  "gcc-13": {
    cmakeCompiler: "g++",
    compiler: "g++",
    docker: true,
    dockerImage: "gcc:13",
    kind: "gcc",
    version: "13",
  },
  "gcc-14": {
    cmakeCompiler: "g++",
    compiler: "g++",
    docker: true,
    dockerImage: "gcc:14",
    kind: "gcc",
    version: "14",
  },
  "gcc-latest": {
    cmakeCompiler: "g++",
    compiler: "g++",
    docker: true,
    dockerImage: "gcc:latest",
    kind: "gcc",
    version: "latest",
  },
};

function compact<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T;
}

function normalizeName(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error("Compiler profile name cannot be empty.");
  }

  if (!/^[A-Za-z0-9._-]+$/u.test(normalized)) {
    throw new Error(
      "Compiler profile name may only contain letters, numbers, dots, underscores, and dashes.",
    );
  }

  return normalized;
}

function normalizeString(value: string | undefined, label: string) {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${label} cannot be empty.`);
  }

  return normalized;
}

function normalizeKind(value: string | undefined): CompilerKind {
  const kind = (value ?? "custom").trim().toLowerCase();

  if (kind === "gcc" || kind === "clang" || kind === "custom") {
    return kind;
  }

  throw new Error("Option --kind must be one of: gcc, clang, custom.");
}

function getDefaultCompiler(kind: CompilerKind) {
  if (kind === "clang") {
    return "clang++";
  }

  if (kind === "gcc") {
    return "g++";
  }

  return "c++";
}

function getDefaultDockerImage(kind: CompilerKind, version: string | undefined) {
  const tag = version || "latest";

  if (kind === "gcc") {
    return `gcc:${tag}`;
  }

  if (kind === "clang") {
    return `silkeh/clang:${tag}`;
  }

  return undefined;
}

function getProfilesFilePath() {
  return path.resolve(process.cwd(), COMPILER_PROFILES_FILE_NAME);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readProfile(value: unknown, label: string): CompilerProfile {
  if (!isRecord(value)) {
    throw new Error(`${label} must be a JSON object.`);
  }

  const kind = normalizeKind(
    typeof value.kind === "string" ? value.kind : undefined,
  );
  const compiler = normalizeString(
    typeof value.compiler === "string" ? value.compiler : undefined,
    `${label}.compiler`,
  ) || getDefaultCompiler(kind);
  const cmakeCompiler = normalizeString(
    typeof value.cmakeCompiler === "string" ? value.cmakeCompiler : undefined,
    `${label}.cmakeCompiler`,
  );
  const dockerImage = normalizeString(
    typeof value.dockerImage === "string" ? value.dockerImage : undefined,
    `${label}.dockerImage`,
  );
  const version = normalizeString(
    typeof value.version === "string" ? value.version : undefined,
    `${label}.version`,
  );

  if ("docker" in value && typeof value.docker !== "boolean") {
    throw new Error(`${label}.docker must be a boolean.`);
  }

  return {
    ...(cmakeCompiler ? { cmakeCompiler } : {}),
    compiler,
    ...(typeof value.docker === "boolean" ? { docker: value.docker } : {}),
    ...(dockerImage ? { dockerImage } : {}),
    kind,
    ...(version ? { version } : {}),
  };
}

async function readCompilerProfilesFile(): Promise<CompilerProfilesFile> {
  try {
    const parsed = JSON.parse(
      await fsp.readFile(getProfilesFilePath(), "utf8"),
    ) as unknown;

    if (!isRecord(parsed)) {
      throw new Error(`${COMPILER_PROFILES_FILE_NAME} must be a JSON object.`);
    }

    const profilesValue = parsed.profiles ?? {};

    if (!isRecord(profilesValue)) {
      throw new Error(`${COMPILER_PROFILES_FILE_NAME}.profiles must be a JSON object.`);
    }

    const profiles = Object.fromEntries(
      Object.entries(profilesValue).map(([name, profile]) => [
        normalizeName(name),
        readProfile(profile, `profiles.${name}`),
      ]),
    );
    const defaultProfile = normalizeString(
      typeof parsed.default === "string" ? parsed.default : undefined,
      `${COMPILER_PROFILES_FILE_NAME}.default`,
    );

    return {
      ...(defaultProfile ? { default: defaultProfile } : {}),
      profiles,
    };
  } catch (error: unknown) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code === "ENOENT") {
      return EMPTY_PROFILES_FILE;
    }

    throw error;
  }
}

async function writeCompilerProfilesFile(file: CompilerProfilesFile) {
  const sortedProfiles = Object.fromEntries(
    Object.entries(file.profiles).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );
  const content = compact({
    default: file.default,
    profiles: sortedProfiles,
  });

  await fsp.writeFile(
    getProfilesFilePath(),
    `${JSON.stringify(content, null, 2)}\n`,
    "utf8",
  );
}

export function getBuiltinCompilerProfiles() {
  return { ...BUILTIN_COMPILER_PROFILES };
}

export async function listCompilerProfiles(): Promise<CompilerProfileEntry[]> {
  const file = await readCompilerProfilesFile();
  const entries = new Map<string, CompilerProfileEntry>();

  for (const [name, profile] of Object.entries(BUILTIN_COMPILER_PROFILES)) {
    entries.set(name, {
      default: file.default === name,
      name,
      profile,
      source: "builtin",
    });
  }

  for (const [name, profile] of Object.entries(file.profiles)) {
    entries.set(name, {
      default: file.default === name,
      name,
      profile,
      source: "project",
    });
  }

  return [...entries.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

export async function resolveCompilerProfile(name?: string) {
  const file = await readCompilerProfilesFile();
  const profileName = name ? normalizeName(name) : file.default;

  if (!profileName) {
    return undefined;
  }

  const profile = file.profiles[profileName] ??
    BUILTIN_COMPILER_PROFILES[profileName];

  if (!profile) {
    throw new Error(`Cannot find compiler profile: ${profileName}`);
  }

  return {
    name: profileName,
    profile,
  };
}

export async function addCompilerProfile(
  nameInput: string,
  options: AddCompilerProfileOptions,
) {
  const name = normalizeName(nameInput);
  const file = await readCompilerProfilesFile();
  const kind = normalizeKind(options.kind);
  const version = normalizeString(options.version, "Option --version");
  const dockerImage = normalizeString(
    options.dockerImage,
    "Option --docker-image",
  ) || getDefaultDockerImage(kind, version);
  const docker = options.host ? false : options.docker ?? Boolean(dockerImage);
  const compiler = normalizeString(options.compiler, "Option --compiler") ||
    getDefaultCompiler(kind);
  const cmakeCompiler = normalizeString(
    options.cmakeCompiler,
    "Option --cmake-compiler",
  ) || compiler;
  const profile: CompilerProfile = {
    ...(cmakeCompiler ? { cmakeCompiler } : {}),
    compiler,
    docker,
    ...(docker && dockerImage ? { dockerImage } : {}),
    kind,
    ...(version ? { version } : {}),
  };

  file.profiles[name] = profile;

  if (options.setDefault) {
    file.default = name;
  }

  await writeCompilerProfilesFile(file);

  return {
    name,
    profile,
  };
}

export async function setDefaultCompilerProfile(nameInput: string) {
  const name = normalizeName(nameInput);
  const file = await readCompilerProfilesFile();

  if (!file.profiles[name] && !BUILTIN_COMPILER_PROFILES[name]) {
    throw new Error(`Cannot find compiler profile: ${name}`);
  }

  file.default = name;
  await writeCompilerProfilesFile(file);

  return {
    name,
  };
}

export async function removeCompilerProfile(nameInput: string) {
  const name = normalizeName(nameInput);
  const file = await readCompilerProfilesFile();
  const existed = Boolean(file.profiles[name]);

  if (!existed) {
    throw new Error(`Cannot find project compiler profile: ${name}`);
  }

  delete file.profiles[name];

  if (file.default === name) {
    delete file.default;
  }

  await writeCompilerProfilesFile(file);

  return {
    name,
  };
}

function quoteCommandArg(value: string) {
  if (!value) {
    return "''";
  }

  if (/^[A-Za-z0-9_./:=@%+-]+$/u.test(value)) {
    return value;
  }

  return `'${value.replace(/'/g, "'\\''")}'`;
}

function formatCommand(command: string, args: string[]) {
  return [command, ...args].map(quoteCommandArg).join(" ");
}

async function runCommand(command: string, args: string[], dryRun = false) {
  const formatted = formatCommand(command, args);

  if (dryRun) {
    logger.info("Dry run; command was not executed.");
    logger.raw(formatted);
    return;
  }

  logger.info(`Running ${formatted}`);

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

export async function installCompilerProfile(
  nameInput: string,
  options: InstallCompilerProfileOptions = {},
) {
  const resolved = await resolveCompilerProfile(nameInput);

  if (!resolved) {
    throw new Error(`Cannot find compiler profile: ${nameInput}`);
  }

  const dockerImage = normalizeString(
    options.dockerImage,
    "Option --docker-image",
  ) || resolved.profile.dockerImage;

  if (!dockerImage) {
    throw new Error(
      `Compiler profile ${resolved.name} does not define a Docker image to pull.`,
    );
  }

  await runCommand("docker", ["pull", dockerImage], options.dryRun);

  if (options.setDefault && !options.dryRun) {
    await setDefaultCompilerProfile(resolved.name);
  }

  return {
    dockerImage,
    name: resolved.name,
  };
}
