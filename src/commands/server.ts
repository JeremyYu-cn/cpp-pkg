import { Command, InvalidArgumentError } from "commander";
import { logger } from "../tools/logger";
import { startPackageServer } from "../tools/server";

type ServerOptions = {
  host: string;
  httpProxy?: string;
  httpsProxy?: string;
  port: number;
};

function parsePort(value: string) {
  const port = Number(value);

  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new InvalidArgumentError("Expected a TCP port between 0 and 65535.");
  }

  return port;
}

function normalizeHost(value: string) {
  const host = value.trim();

  if (!host) {
    throw new InvalidArgumentError("Host cannot be empty.");
  }

  return host;
}

/**
 * Registers the command that starts the browser-based package manager.
 */
export function registerServerCommand(program: Command) {
  program
    .command("server")
    .alias("serve")
    .description("Start a local web server for browsing and downloading packages")
    .option(
      "-H, --host <host>",
      "Host interface to bind the server to",
      normalizeHost,
      "127.0.0.1",
    )
    .option(
      "-p, --port <port>",
      "Port to listen on; use 0 to choose a random open port",
      parsePort,
      4936,
    )
    .option("--http-proxy <url>", "HTTP request proxy, overrides config")
    .option("--https-proxy <url>", "HTTPS request proxy, overrides config")
    .action(async (options: ServerOptions) => {
      const server = await startPackageServer(options);

      logger.success(`cppkg web server is running at ${server.url}`);
      logger.info("Press Ctrl+C to stop the server.");
    });
}
