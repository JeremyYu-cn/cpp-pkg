import type { InstalledDependency, ManifestDependency } from "./types";

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString();
}

export function formatStars(stars: number) {
  if (stars >= 1_000_000) {
    return `${(stars / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
  }

  if (stars >= 1_000) {
    return `${(stars / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  }

  return String(stars);
}

export function packageKey(packageItem: InstalledDependency) {
  return `${packageItem.repository.url}:${packageItem.version}:${packageItem.install.target}`;
}

export function manifestKey(dependency: ManifestDependency) {
  return `${dependency.name || dependency.source}:${dependency.source}`;
}
