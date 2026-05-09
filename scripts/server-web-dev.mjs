import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import net from "node:net";
import path from "node:path";
import pc from "picocolors";

const require = createRequire(import.meta.url);
const viteBinPath = path.join(
  path.dirname(require.resolve("vite/package.json")),
  "bin",
  "vite.js",
);

const children = new Set();

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => resolve(false));
    server.listen(port, "127.0.0.1", () => {
      server.close(() => resolve(true));
    });
  });
}

async function findAvailablePort(startPort) {
  for (let port = startPort; port < startPort + 100; port += 1) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }

  throw new Error(`No available port found from ${startPort} to ${startPort + 99}`);
}

function spawnChild(label, command, args, options = {}) {
  const child = spawn(command, args, {
    env: {
      ...process.env,
      ...options.env,
    },
    stdio: "inherit",
  });

  children.add(child);

  child.on("exit", (code, signal) => {
    children.delete(child);

    if (signal) {
      return;
    }

    if (code && code !== 0) {
      process.stderr.write(
        `${pc.red(pc.bold("[error]"))} ${label} exited with code ${code}\n`,
      );
      stopAll();
      process.exitCode = code;
    }
  });

  child.on("error", (error) => {
    process.stderr.write(
      `${pc.red(pc.bold("[error]"))} Failed to start ${label}: ${error.message}\n`,
    );
    stopAll();
    process.exitCode = 1;
  });

  return child;
}

function stopAll() {
  for (const child of children) {
    child.kill("SIGTERM");
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    stopAll();
    process.exit(0);
  });
}

const apiPort = await findAvailablePort(4936);
const apiUrl = `http://127.0.0.1:${apiPort}`;

process.stdout.write(
  `${pc.cyan(pc.bold("[info]"))} Starting cppkg API on ${apiUrl}\n`,
);
spawnChild("cppkg API", process.execPath, [
  "--import=tsx",
  "./src/main.ts",
  "server",
  "--port",
  String(apiPort),
]);

process.stdout.write(
  `${pc.cyan(pc.bold("[info]"))} Starting Vite web UI with /api proxy\n`,
);
spawnChild("Vite web UI", process.execPath, [
  viteBinPath,
  "--force",
  "--config",
  "vite.server.config.mjs",
], {
  env: {
    CPPKG_SERVER_API_URL: apiUrl,
  },
});
