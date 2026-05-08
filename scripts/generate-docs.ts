import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import pc from "picocolors";
import { createProgram, getPackageVersion } from "../src/program";

type PackageJson = {
  name?: unknown;
};

type CommandLike = ReturnType<typeof createProgram>;

type CommandArgumentLike = {
  _name?: string;
  description?: string;
  name?: () => string;
  required?: boolean;
  variadic?: boolean;
};

type CommandOptionLike = {
  defaultValue?: unknown;
  description?: string;
  flags: string;
  optional?: boolean;
  required?: boolean;
  variadic?: boolean;
};

type CommandArgumentDoc = {
  description: string;
  name: string;
  required: boolean;
  variadic: boolean;
};

type CommandOptionDoc = {
  defaultValue?: string;
  description: string;
  flags: string;
  optional: boolean;
  required: boolean;
  variadic: boolean;
};

type CommandSummaryDoc = {
  aliases: string[];
  command: string;
  description: string;
  name: string;
  path: string;
};

type CommandDoc = CommandSummaryDoc & {
  arguments: CommandArgumentDoc[];
  children: CommandDoc[];
  examples: string[];
  options: CommandOptionDoc[];
  subcommands: CommandSummaryDoc[];
  usage: string;
};

const rootDir = path.resolve(__dirname, "..");

const examplesByCommand: Record<string, string[]> = {
  add: [
    "cppkg-cli add nlohmann/json",
    "cppkg-cli add fmtlib/fmt --name fmt --tag 11.2.0 --install",
  ],
  build: [
    "cppkg-cli build --release",
    "cppkg-cli build --toolchain clang-18 --docker --dry-run",
  ],
  cache: ["cppkg-cli cache list", "cppkg-cli cache clean --older-than 30"],
  "cache clean": [
    "cppkg-cli cache clean",
    "cppkg-cli cache clean --older-than 7",
  ],
  "cache list": ["cppkg-cli cache list"],
  cmake: ["cppkg-cli cmake", "cppkg-cli cmake --output cmake/cppkg.cmake --force"],
  compile: [
    "cppkg-cli compile src/main.cpp -o app",
    "cppkg-cli compile src/main.cpp --toolchain gcc-14 --docker --dry-run",
  ],
  compiler: [
    "cppkg-cli compiler list",
    "cppkg-cli compiler install clang-18 --set-default",
  ],
  "compiler add": [
    "cppkg-cli compiler add local-clang --host --compiler clang++ --set-default",
    "cppkg-cli compiler add gcc-docker --docker --docker-image gcc:14 --compiler g++",
  ],
  "compiler current": ["cppkg-cli compiler current"],
  "compiler install": [
    "cppkg-cli compiler install gcc-14",
    "cppkg-cli compiler install clang-18 --dry-run",
  ],
  "compiler list": ["cppkg-cli compiler list"],
  "compiler remove": ["cppkg-cli compiler remove local-clang"],
  "compiler use": ["cppkg-cli compiler use clang-18"],
  config: ["cppkg-cli config list", "cppkg-cli config set cacheDir cpp_libs/cache"],
  "config get": ["cppkg-cli config get installDir"],
  "config list": ["cppkg-cli config list"],
  "config remove": ["cppkg-cli config remove cacheDir"],
  "config set": ["cppkg-cli config set installDir vendor/cpp_libs"],
  get: [
    "cppkg-cli get https://github.com/nlohmann/json",
    "cppkg-cli get https://github.com/fmtlib/fmt --version-range '^11.0.0'",
  ],
  init: ["cppkg-cli init", "cppkg-cli init --force"],
  inspect: ["cppkg-cli inspect", "cppkg-cli inspect --add --install"],
  install: ["cppkg-cli install", "cppkg-cli install json fmt --frozen-lockfile"],
  list: ["cppkg-cli list"],
  remove: ["cppkg-cli remove json"],
  search: ["cppkg-cli search json", "cppkg-cli search http client --limit 20"],
  server: ["cppkg-cli server", "cppkg-cli server --host 0.0.0.0 --port 4936"],
  status: ["cppkg-cli status"],
  update: ["cppkg-cli update", "cppkg-cli update fmt --tag 11.2.0"],
};

function getCommandSegments(command: CommandLike) {
  const segments: string[] = [];
  let current: CommandLike | undefined = command;

  if (!command.parent && command.name() !== "cppkg-cli") {
    return [command.name()];
  }

  while (current?.parent) {
    segments.unshift(current.name());
    current = current.parent as CommandLike | undefined;
  }

  return segments;
}

function getAliases(command: CommandLike) {
  return command.aliases();
}

function getDescription(command: CommandLike) {
  return command.description();
}

function getArguments(command: CommandLike): CommandArgumentDoc[] {
  const args = Array.isArray(command.registeredArguments)
    ? (command.registeredArguments as CommandArgumentLike[])
    : [];

  return args.map((argument) => {
    const name =
      typeof argument.name === "function"
        ? argument.name()
        : argument._name || "";

    return {
      description: argument.description || "",
      name,
      required: Boolean(argument.required),
      variadic: Boolean(argument.variadic),
    };
  });
}

function getDefaultValue(option: CommandOptionLike) {
  if (option.defaultValue === undefined) {
    return undefined;
  }

  if (Array.isArray(option.defaultValue)) {
    return option.defaultValue.join(", ");
  }

  return String(option.defaultValue);
}

function getOptions(command: CommandLike): CommandOptionDoc[] {
  const options = command.options as readonly CommandOptionLike[];

  return options.map((option) => {
    const entry: CommandOptionDoc = {
      description: option.description || "",
      flags: option.flags,
      optional: Boolean(option.optional),
      required: Boolean(option.required),
      variadic: Boolean(option.variadic),
    };
    const defaultValue = getDefaultValue(option);

    if (defaultValue !== undefined) {
      entry.defaultValue = defaultValue;
    }

    return entry;
  });
}

function getVisibleCommands(command: CommandLike) {
  return command.commands as CommandLike[];
}

function formatArgumentUsage(argument: CommandArgumentDoc) {
  const token = `${argument.name}${argument.variadic ? "..." : ""}`;

  return argument.required ? `<${token}>` : `[${token}]`;
}

function getUsage(
  command: CommandLike,
  segments: string[],
  args: CommandArgumentDoc[],
) {
  const tokens = ["cppkg-cli", ...segments];

  if (getOptions(command).length > 0) {
    tokens.push("[options]");
  }

  tokens.push(...args.map(formatArgumentUsage));

  if (getVisibleCommands(command).length > 0) {
    tokens.push("[command]");
  }

  return tokens.join(" ");
}

function getSubcommands(command: CommandLike): CommandSummaryDoc[] {
  return getVisibleCommands(command).map((subcommand) => {
    const segments = getCommandSegments(subcommand);
    const pathName = segments.join(" ");

    return {
      aliases: getAliases(subcommand),
      command: ["cppkg-cli", ...segments].join(" "),
      description: getDescription(subcommand),
      name: subcommand.name(),
      path: pathName,
    };
  });
}

function collectCommand(command: CommandLike): CommandDoc {
  const segments = getCommandSegments(command);
  const pathName = segments.join(" ");
  const args = getArguments(command);

  return {
    aliases: getAliases(command),
    arguments: args,
    children: getVisibleCommands(command).map(collectCommand),
    command: ["cppkg-cli", ...segments].join(" "),
    description: getDescription(command),
    examples: examplesByCommand[pathName] || [],
    name: command.name(),
    options: getOptions(command),
    path: pathName,
    subcommands: getSubcommands(command),
    usage: getUsage(command, segments, args),
  };
}

export async function generateDocs() {
  const packageJson = JSON.parse(
    await readFile(path.join(rootDir, "package.json"), "utf8"),
  ) as PackageJson;
  const program = createProgram(getPackageVersion());
  const rootOptions = getOptions(program);

  const reference = {
    commands: getVisibleCommands(program).map(collectCommand),
    description: getDescription(program),
    name: program.name(),
    packageName:
      typeof packageJson.name === "string" ? packageJson.name : "cppkg-cli",
    root: {
      command: program.name(),
      description: getDescription(program),
      options: rootOptions,
      usage:
        rootOptions.length > 0
          ? `${program.name()} [options] [command]`
          : `${program.name()} [command]`,
    },
    version: getPackageVersion(),
  };

  const docsDir = path.join(rootDir, "docs");
  const docsAssetsDir = path.join(docsDir, "assets");

  await mkdir(docsAssetsDir, { recursive: true });
  await copyFile(
    path.join(rootDir, "assets", "icon.png"),
    path.join(docsAssetsDir, "icon.png"),
  );
  await writeFile(
    path.join(docsDir, "commands.json"),
    `${JSON.stringify(reference, null, 2)}\n`,
  );

  process.stdout.write(
    `${pc.green(pc.bold("[ok]"))} Generated docs/commands.json\n`,
  );
}

if (require.main === module) {
  generateDocs().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${pc.red(pc.bold("[error]"))} ${message}\n`);
    process.exitCode = 1;
  });
}
