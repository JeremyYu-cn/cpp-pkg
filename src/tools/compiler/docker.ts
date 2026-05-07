import {
  DEFAULT_DOCKER_IMAGE,
  DEFAULT_DOCKER_WORKDIR,
  type CompilerEnvironmentOptions,
  type PlannedCommand,
} from "./types";
import { normalizeCommand } from "./paths";

function getDockerImage(options: CompilerEnvironmentOptions) {
  return normalizeCommand(
    options.dockerImage,
    DEFAULT_DOCKER_IMAGE,
    "Option --docker-image",
  );
}

export function dockerizeCommand(
  command: string,
  args: string[],
  options: CompilerEnvironmentOptions,
): PlannedCommand {
  const projectRoot = process.cwd();

  if (!options.docker) {
    return {
      args,
      command,
      cwd: projectRoot,
    };
  }

  return {
    args: [
      "run",
      "--rm",
      "-v",
      `${projectRoot}:${DEFAULT_DOCKER_WORKDIR}`,
      "-w",
      DEFAULT_DOCKER_WORKDIR,
      getDockerImage(options),
      command,
      ...args,
    ],
    command: "docker",
    cwd: projectRoot,
  };
}
