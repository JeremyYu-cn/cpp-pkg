import { promises as fsp } from "node:fs";
import fs from "node:fs";
import path from "node:path";
import { logger } from "./logger";

export type CreateOptions = {
  headerOnly?: boolean;
  c?: boolean;
  output?: string;
};

function toHeaderGuard(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function toPascalCase(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]+(.)?/g, (_match: string, char?: string) =>
      char ? char.toUpperCase() : "",
    )
    .replace(/^[a-z]/, (char) => char.toUpperCase());
}

/**
 * Scaffolds a new C/C++ library project.
 */
export async function createProject(
  projectName: string,
  options: CreateOptions = {},
) {
  const projectDir = options.output
    ? path.resolve(process.cwd(), options.output)
    : path.resolve(process.cwd(), projectName);

  if (fs.existsSync(projectDir)) {
    throw new Error(
      `Directory already exists: ${path.relative(process.cwd(), projectDir) || projectName}`,
    );
  }

  await fsp.mkdir(projectDir, { recursive: true });

  const isC = options.c === true;
  const ext = isC ? "c" : "cpp";
  const headerExt = isC ? "h" : "hpp";
  const langName = isC ? "C" : "C++";
  const guard = toHeaderGuard(projectName);

  // cppkg.json
  const cppkgJson = {
    dependencies: {},
  };

  await fsp.writeFile(
    path.join(projectDir, "cppkg.json"),
    `${JSON.stringify(cppkgJson, null, 2)}\n`,
    "utf8",
  );
  logger.info(`Created cppkg.json`);

  // include/<name>/ stub header
  const includeDir = path.join(projectDir, "include", projectName);
  await fsp.mkdir(includeDir, { recursive: true });

  const headerContent = isC
    ? `#ifndef ${guard}_H
#define ${guard}_H

#ifdef __cplusplus
extern "C" {
#endif

void ${projectName.replace(/-/g, "_")}_hello(void);

#ifdef __cplusplus
}
#endif

#endif /* ${guard}_H */
`
    : `#ifndef ${guard}_HPP
#define ${guard}_HPP

namespace ${projectName.replace(/-/g, "_")} {

void hello();

} // namespace ${projectName.replace(/-/g, "_")}

#endif // ${guard}_HPP
`;

  await fsp.writeFile(
    path.join(includeDir, `${projectName}.${headerExt}`),
    headerContent,
    "utf8",
  );
  logger.info(`Created include/${projectName}/${projectName}.${headerExt}`);

  if (!options.headerOnly) {
    // src/ stub source
    const srcDir = path.join(projectDir, "src");
    await fsp.mkdir(srcDir, { recursive: true });

    const sourceContent = isC
      ? `#include "${projectName}/${projectName}.h"
#include <stdio.h>

void ${projectName.replace(/-/g, "_")}_hello(void) {
    printf("Hello from ${projectName}!\\n");
}
`
      : `#include "${projectName}/${projectName}.hpp"
#include <iostream>

namespace ${projectName.replace(/-/g, "_")} {

void hello() {
    std::cout << "Hello from ${projectName}!" << std::endl;
}

} // namespace ${projectName.replace(/-/g, "_")}
`;

    await fsp.writeFile(
      path.join(srcDir, `${projectName}.${ext}`),
      sourceContent,
      "utf8",
    );
    logger.info(`Created src/${projectName}.${ext}`);

    // CMakeLists.txt
    const cmakeProjectName = toPascalCase(projectName);
    const cmakeContent = `cmake_minimum_required(VERSION 3.14)
project(${cmakeProjectName} VERSION 0.1.0 LANGUAGES ${isC ? "C" : "CXX"})

set(CMAKE_${isC ? "C" : "CXX"}_STANDARD ${isC ? "17" : "17"})
set(CMAKE_${isC ? "C" : "CXX"}_STANDARD_REQUIRED ON)

add_library(\${PROJECT_NAME}
    src/${projectName}.${ext}
)

target_include_directories(\${PROJECT_NAME} PUBLIC
    \${CMAKE_CURRENT_SOURCE_DIR}/include
)
`;

    await fsp.writeFile(
      path.join(projectDir, "CMakeLists.txt"),
      cmakeContent,
      "utf8",
    );
    logger.info("Created CMakeLists.txt");
  }

  // .gitignore
  const gitignoreContent = `cpp_libs/
vendor/
build/
${isC ? "" : `*.o
*.obj
`}*.out
*.exe
.DS_Store
`;

  await fsp.writeFile(
    path.join(projectDir, ".gitignore"),
    gitignoreContent,
    "utf8",
  );
  logger.info("Created .gitignore");

  // README.md
  const readmeContent = `# ${projectName}

A ${langName} library.

## Building

\`\`\`sh
mkdir build && cd build
cmake ..
cmake --build .
\`\`\`

## License

MIT
`;

  await fsp.writeFile(
    path.join(projectDir, "README.md"),
    readmeContent,
    "utf8",
  );
  logger.info("Created README.md");

  const relativeDir =
    path.relative(process.cwd(), projectDir) || projectName;

  logger.success(`Created ${langName} project in ${relativeDir}`);

  if (!options.headerOnly) {
    logger.raw("");
    logger.detail("Next", `cd ${relativeDir} && cppkg-cli install`);
  }
}
