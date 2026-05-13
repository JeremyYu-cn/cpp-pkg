import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { handleApiRequest } from "./api";
import { getErrorMessage, HttpError } from "./errors";
import { sendJson } from "./response";
import { handleStaticRequest } from "./static";
import type { PackageServerOptions } from "./types";

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  options: PackageServerOptions,
) {
  try {
    const requestUrl = new URL(
      req.url || "/",
      `http://${req.headers.host || `${options.host}:${options.port}`}`,
    );

    if (requestUrl.pathname.startsWith("/api/")) {
      await handleApiRequest(req, res, requestUrl, options);
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      throw new HttpError(405, "Method not allowed.");
    }

    await handleStaticRequest(res, requestUrl);
  } catch (error: unknown) {
    const statusCode = error instanceof HttpError ? error.statusCode : 500;

    if (statusCode >= 500) {
      console.error("[cppkg server]", getErrorMessage(error));
    }

    sendJson(res, statusCode, {
      error: getErrorMessage(error),
    });
  }
}

function getDisplayHost(host: string) {
  if (host === "0.0.0.0" || host === "::") {
    return "localhost";
  }

  return host.includes(":") ? `[${host}]` : host;
}

/**
 * Starts the local cppkg web server used by the `server` command.
 */
export async function startPackageServer(options: PackageServerOptions) {
  const server = createServer((req, res) => {
    void handleRequest(req, res, options);
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port, options.host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();
  const port =
    typeof address === "object" && address ? address.port : options.port;
  const url = `http://${getDisplayHost(options.host)}:${port}`;

  return {
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      }),
    server,
    url,
  };
}

export type { PackageServerOptions } from "./types";
