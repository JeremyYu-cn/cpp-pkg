import type { IncomingMessage, ServerResponse } from "node:http";
import { subscribeToPackageTasks } from "./tasks";

function writeEvent(res: ServerResponse, event: string, payload: unknown) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export function handleTaskEvents(req: IncomingMessage, res: ServerResponse) {
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
    clearInterval(heartbeat);
    unsubscribe();
  });
}
