import pc from "picocolors";
import { AsyncLocalStorage } from "node:async_hooks";

type TableRow = Record<string, unknown>;
type WritableStream = NodeJS.WriteStream;
type LoggerSink = (line: string, stream: "stderr" | "stdout") => void;

const loggerSinkStorage = new AsyncLocalStorage<LoggerSink>();

function writeLine(message = "", stream: WritableStream = process.stdout) {
  const line = String(message);
  const sink = loggerSinkStorage.getStore();

  sink?.(line, stream === process.stderr ? "stderr" : "stdout");
  stream.write(`${line}\n`);
}

function formatTag(label: string, color: (value: string) => string) {
  return color(pc.bold(`[${label}]`));
}

function stringifyValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return String(value);
}

function getTableColumns(rows: TableRow[]) {
  return [...new Set(rows.flatMap((row) => Object.keys(row)))];
}

function formatTableRow(row: TableRow, columns: string[], widths: Map<string, number>) {
  return columns
    .map((column) =>
      stringifyValue(row[column]).padEnd(widths.get(column) ?? column.length),
    )
    .join(pc.dim("  "));
}

export const logger = {
  raw(value: unknown = "") {
    writeLine(stringifyValue(value));
  },
  info(message: string) {
    writeLine(`${formatTag("info", pc.cyan)} ${message}`);
  },
  success(message: string) {
    writeLine(`${formatTag("ok", pc.green)} ${message}`);
  },
  warn(message: string) {
    writeLine(`${formatTag("warn", pc.yellow)} ${message}`);
  },
  error(message: string) {
    writeLine(`${formatTag("error", pc.red)} ${message}`, process.stderr);
  },
  progress(message: string) {
    writeLine(`${pc.dim("...")} ${message}`);
  },
  step(current: number, total: number, message: string) {
    writeLine(`${pc.dim(`[${current}/${total}]`)} ${message}`);
  },
  detail(label: string, value: unknown) {
    writeLine(`${pc.dim(`${label}:`)} ${stringifyValue(value)}`);
  },
  table(rows: TableRow[]) {
    if (!rows.length) {
      return;
    }

    const columns = getTableColumns(rows);
    const widths = new Map(
      columns.map((column) => [
        column,
        Math.max(
          column.length,
          ...rows.map((row) => stringifyValue(row[column]).length),
        ),
      ]),
    );
    const header = columns
      .map((column) => pc.bold(column.padEnd(widths.get(column) ?? column.length)))
      .join(pc.dim("  "));
    const separator = columns
      .map((column) => pc.dim("-".repeat(widths.get(column) ?? column.length)))
      .join(pc.dim("  "));

    writeLine(header);
    writeLine(separator);

    for (const row of rows) {
      writeLine(formatTableRow(row, columns, widths));
    }
  },
};

export function withLoggerSink<T>(
  sink: LoggerSink,
  operation: () => Promise<T>,
) {
  return loggerSinkStorage.run(sink, operation);
}
