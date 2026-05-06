import type { InstalledDependency } from "../types/global";
import { resolveInputSource } from "./download/sources";

type RepositoryProvider = "github" | "gitee";

function addSelectorVariant(variants: Set<string>, value: string | undefined) {
  const normalized = value?.trim().replace(/\/+$/, "");

  if (!normalized) {
    return;
  }

  variants.add(normalized);
  variants.add(normalized.replace(/\.git$/i, ""));
}

function getRepositoryProvider(value: string) {
  try {
    const parsed = new URL(value);

    if (["github.com", "www.github.com", "api.github.com"].includes(parsed.hostname)) {
      return "github" as const;
    }

    if (["gitee.com", "www.gitee.com"].includes(parsed.hostname)) {
      return "gitee" as const;
    }
  } catch {
    // Plain owner/repo selectors are provider-neutral.
  }

  return null;
}

function addRepositoryPathVariants(
  variants: Set<string>,
  repositoryPath: string,
  providers: RepositoryProvider[] = [],
  includeBarePath = true,
) {
  const normalizedPath = repositoryPath.trim().replace(/^\/+|\/+$/g, "")
    .replace(/\.git$/i, "");

  if (!normalizedPath) {
    return;
  }

  if (includeBarePath) {
    addSelectorVariant(variants, normalizedPath);
    addSelectorVariant(variants, `/${normalizedPath}`);
  }

  if (providers.includes("github")) {
    addSelectorVariant(variants, `github.com/${normalizedPath}`);
    addSelectorVariant(variants, `https://github.com/${normalizedPath}`);
  }

  if (providers.includes("gitee")) {
    addSelectorVariant(variants, `gitee.com/${normalizedPath}`);
    addSelectorVariant(variants, `https://gitee.com/${normalizedPath}`);
    addSelectorVariant(variants, `https://gitee.com/${normalizedPath}.git`);
  }
}

function resolveURLLikeSelector(value: string) {
  try {
    return resolveInputSource(value);
  } catch {
    if (/^(?:www\.)?(?:github|gitee)\.com\//i.test(value)) {
      try {
        return resolveInputSource(`https://${value}`);
      } catch {
        return null;
      }
    }

    return null;
  }
}

function addURLVariants(variants: Set<string>, value: string) {
  const source = resolveURLLikeSelector(value);

  if (!source) {
    return;
  }

  addSelectorVariant(variants, source.repositoryUrl);

  if (source.kind === "github-repository") {
    addRepositoryPathVariants(variants, source.repositoryPath, ["github"], false);
  } else if (source.kind === "gitee-repository") {
    addRepositoryPathVariants(variants, source.repositoryPath, ["gitee"], false);
  }
}

/**
 * Expands a user selector into the supported lookup forms.
 */
export function getSelectorVariants(selector: string) {
  const variants = new Set<string>();
  const normalizedSelector = selector.trim().replace(/\/+$/, "");
  const resolvedSource = resolveURLLikeSelector(normalizedSelector);

  addSelectorVariant(variants, normalizedSelector);

  if (resolvedSource) {
    addURLVariants(variants, normalizedSelector);
    return [...variants];
  }

  addRepositoryPathVariants(
    variants,
    normalizedSelector
      .replace(/^https?:\/\/(?:www\.)?github\.com\//i, "")
      .replace(/^github\.com\//i, "")
      .replace(/^https?:\/\/(?:www\.)?gitee\.com\//i, "")
      .replace(/^gitee\.com\//i, "")
      .replace(/^https?:\/\/api\.github\.com\/repos\//i, "")
      .replace(/^https?:\/\/gitee\.com\/api\/v5\/repos\//i, ""),
  );

  return [...variants];
}

export function getManifestDependencySelectorVariants(
  sourceURL: string,
  name: string | undefined,
) {
  const variants = new Set<string>();

  addSelectorVariant(variants, name);
  addSelectorVariant(variants, sourceURL);

  try {
    const source = resolveInputSource(sourceURL);

    addSelectorVariant(variants, source.packageName);
    addSelectorVariant(variants, source.repositoryUrl);

    if (source.kind === "github-repository") {
      addRepositoryPathVariants(variants, source.repositoryPath, ["github"]);
    } else if (source.kind === "gitee-repository") {
      addRepositoryPathVariants(variants, source.repositoryPath, ["gitee"]);
    }
  } catch {
    // Manifest validation should catch invalid sources before this point.
  }

  return variants;
}

export function getInstalledDependencyRepositoryVariants(
  dependency: InstalledDependency,
) {
  const variants = new Set<string>();
  const provider = getRepositoryProvider(dependency.repository.url);

  addSelectorVariant(variants, dependency.repository.path);
  addSelectorVariant(variants, dependency.repository.url);
  addURLVariants(variants, dependency.repository.url);
  addRepositoryPathVariants(
    variants,
    dependency.repository.path,
    provider ? [provider] : [],
  );

  return variants;
}

export function getInstalledDependencySelectorVariants(
  dependency: InstalledDependency,
) {
  const variants = getInstalledDependencyRepositoryVariants(dependency);

  addSelectorVariant(variants, dependency.name);

  return variants;
}
