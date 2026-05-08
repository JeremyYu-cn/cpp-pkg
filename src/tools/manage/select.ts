import type { InstalledDependency } from "../../types/global";
import {
  getInstalledDependencyRepositoryVariants,
  getInstalledDependencySelectorVariants,
  getSelectorVariants,
} from "../selectors";

export function getDependencyIdentity(dependency: InstalledDependency) {
  return (
    dependency.repository.url.trim().replace(/\/+$/, "").replace(/\.git$/i, "") ||
    dependency.repository.path
  );
}

function matchesDependencySelector(
  dependency: InstalledDependency,
  selector: string,
) {
  const variants = getSelectorVariants(selector);
  const dependencyVariants = getInstalledDependencySelectorVariants(dependency);

  return variants.some((variant) => dependencyVariants.has(variant));
}

export function resolveInstalledDependency(
  dependencies: InstalledDependency[],
  selector: string,
) {
  const matches = dependencies.filter((dependency) =>
    matchesDependencySelector(dependency, selector),
  );

  if (!matches.length) {
    throw new Error(`Cannot find installed package: ${selector}`);
  }

  const exactRepositoryMatch = matches.find((dependency) => {
    const variants = getSelectorVariants(selector);
    const repositoryVariants = getInstalledDependencyRepositoryVariants(dependency);

    return variants.some((variant) => repositoryVariants.has(variant));
  });

  if (exactRepositoryMatch) {
    return exactRepositoryMatch;
  }

  if (matches.length > 1) {
    throw new Error(
      `Package selector "${selector}" is ambiguous. Use one of: ${matches.map((dependency) => dependency.repository.path).join(", ")}`,
    );
  }

  return matches[0]!;
}
