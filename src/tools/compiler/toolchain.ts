import type {
  BuildCMakeProjectOptions,
  CompileSourcesOptions,
} from "./types";
import { resolveCompilerProfile } from "../toolchains";

export async function applyCompileToolchain(
  options: CompileSourcesOptions,
): Promise<CompileSourcesOptions> {
  const resolved = await resolveCompilerProfile(options.toolchain);

  if (!resolved) {
    return options;
  }

  return {
    ...options,
    compiler: options.compiler ?? resolved.profile.compiler,
    ...(options.docker === undefined && resolved.profile.docker !== undefined
      ? { docker: resolved.profile.docker }
      : {}),
    ...(options.dockerImage === undefined && resolved.profile.dockerImage
      ? { dockerImage: resolved.profile.dockerImage }
      : {}),
  };
}

export async function applyBuildToolchain(
  options: BuildCMakeProjectOptions,
): Promise<BuildCMakeProjectOptions> {
  const resolved = await resolveCompilerProfile(options.toolchain);

  if (!resolved) {
    return options;
  }

  return {
    ...options,
    compiler: options.compiler ??
      resolved.profile.cmakeCompiler ??
      resolved.profile.compiler,
    ...(options.docker === undefined && resolved.profile.docker !== undefined
      ? { docker: resolved.profile.docker }
      : {}),
    ...(options.dockerImage === undefined && resolved.profile.dockerImage
      ? { dockerImage: resolved.profile.dockerImage }
      : {}),
  };
}
