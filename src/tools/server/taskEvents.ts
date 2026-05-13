import type { IncomingMessage, ServerResponse } from "node:http";
import { subscribeToPackageTasks } from "./tasks";
import { HttpError } from "./errors";

const MAX_SSE_SUBSCRIBERS = 50;
let activeSseConnections = 0;

function writeEvent(res: ServerResponse, event: string, payload: unknown) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export function handleTaskEvents(req: IncomingMessage, res: ServerResponse) {
  if (activeSseConnections >= MAX_SSE_SUBSCRIBERS) {
    throw new HttpError(503, "Too many SSE connections. Try again later.");
  }

  activeSseConnections++;

  res.writeHead(200, {
    "cache-control": "no-store",
    connection: "keep-alive",
    "content-type": "text/event-stream; charset=utf-8",
    "x-accel-buffering": "no",
  });
  res.write(": connected\n\n");

  const unsubscribe = subscribeToPackageTasks((event) => {
    writeEvent(res, event.type, event);
  });
  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 25_000);

  req.on("close", () => {
    activeSseConnections--;
    clearInterval(heartbeat);
    unsubscribe();
  });
}
