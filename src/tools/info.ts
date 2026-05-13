import type { InstalledDependency } from "../types/global";
import { readInstalledDependencies } from "./deps";
import { getSelectorVariants } from "./selectors";

export async function getPackageInfo(
  selector: string,
): Promise<InstalledDependency | undefined> {
  const installed = await readInstalledDependencies();
  const selectorVariants = getSelectorVariants(selector);

  return installed.dependencies.find((dep) => {
    const depName = dep.name.toLowerCase();
    const depUrl = dep.repository.url.toLowerCase();
    const depPath = dep.repository.path.toLowerCase();

    return selectorVariants.some((variant) => {
      const v = variant.toLowerCase();
      return depName === v || depUrl.includes(v) || depPath.includes(v);
    });
  });
}
