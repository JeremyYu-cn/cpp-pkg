import { resolvePackageRootPath } from "../../public/packagePath";
import {
  readInstalledDependencies,
  writeInstalledDependencies,
} from "../deps";
import { removeDependencyFiles } from "./files";
import {
  getDependencyIdentity,
  resolveInstalledDependency,
} from "./select";

export async function removeInstalledPackage(selector: string) {
  const installed = await readInstalledDependencies();

  if (!installed.dependencies.length) {
    throw new Error(
      `No installed packages found in ${resolvePackageRootPath()}`,
    );
  }

  const dependency = resolveInstalledDependency(
    installed.dependencies,
    selector,
  );
  const remainingDependencies = installed.dependencies.filter(
    (item) => getDependencyIdentity(item) !== getDependencyIdentity(dependency),
  );
  const removeResult = await removeDependencyFiles(
    dependency,
    remainingDependencies,
  );

  await writeInstalledDependencies(remainingDependencies);

  return {
    dependency,
    ...removeResult,
  };
}
