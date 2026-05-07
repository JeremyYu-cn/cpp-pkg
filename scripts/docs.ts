import { spawn } from "node:child_process";
import pc from "picocolors";
import { generateDocs } from "./generate-docs";

const npmBin = process.platform === "win32" ? "npm.cmd" : "npm";

function run(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });

    child.on("error", reject);
  });
}

async function main() {
  await run(npmBin, ["run", "build"]);
  await generateDocs();
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${pc.red(pc.bold("[error]"))} ${message}\n`);
  process.exitCode = 1;
});
