import { Command } from "commander";
import { renderDependencyGraph } from "../tools/graph";
import { logger } from "../tools/logger";

type GraphOptions = {
  format?: "ascii" | "dot" | "mermaid";
};

export function registerGraphCommand(program: Command) {
  program
    .command("graph")
    .description("Visualize dependency graph as ASCII tree, DOT, or Mermaid")
    .option(
      "--format <format>",
      "Output format: ascii, dot, or mermaid",
      "ascii",
    )
    .action(async (options: GraphOptions) => {
      const output = await renderDependencyGraph(options.format);
      logger.raw(output);
    });
}
