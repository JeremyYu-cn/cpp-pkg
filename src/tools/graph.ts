import type { InstalledDependency } from "../types/global";
import { readInstalledDependencies } from "./deps";

type GraphFormat = "ascii" | "dot" | "mermaid";

function normalizeUrl(url: string) {
  return url.trim().replace(/\/+$/, "").replace(/\.git$/i, "").toLowerCase();
}

function buildDepMap(deps: InstalledDependency[]) {
  const map = new Map<string, InstalledDependency>();
  for (const dep of deps) {
    map.set(normalizeUrl(dep.repository.url), dep);
  }
  return map;
}

function getRootDeps(deps: InstalledDependency[]) {
  const transitiveUrls = new Set<string>();
  for (const dep of deps) {
    if (dep.transitiveDeps) {
      for (const child of dep.transitiveDeps) {
        transitiveUrls.add(normalizeUrl(child));
      }
    }
  }
  return deps.filter((d) => !transitiveUrls.has(normalizeUrl(d.repository.url)));
}

function getChildren(dep: InstalledDependency, depMap: Map<string, InstalledDependency>) {
  if (!dep.transitiveDeps) return [];
  const children: InstalledDependency[] = [];
  for (const childUrl of dep.transitiveDeps) {
    const child = depMap.get(normalizeUrl(childUrl));
    if (child) children.push(child);
  }
  return children;
}

function renderAsciiTree(deps: InstalledDependency[]): string {
  const depMap = buildDepMap(deps);
  const roots = getRootDeps(deps);
  const lines: string[] = [];
  const visited = new Set<string>();

  function walk(node: InstalledDependency, prefix: string, isLast: boolean) {
    const nodeKey = normalizeUrl(node.repository.url);
    if (visited.has(nodeKey)) {
      lines.push(`${prefix}${isLast ? "└── " : "├── "}${node.name} (circular)`);
      return;
    }
    visited.add(nodeKey);
    lines.push(`${prefix}${isLast ? "└── " : "├── "}${node.name}@${node.version}`);
    const children = getChildren(node, depMap);
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (!child) continue;
      const childPrefix = prefix + (isLast ? "    " : "│   ");
      walk(child, childPrefix, i === children.length - 1);
    }
    visited.delete(nodeKey);
  }

  for (let i = 0; i < roots.length; i++) {
    const root = roots[i];
    if (!root) continue;
    const nodeKey = normalizeUrl(root.repository.url);
    visited.add(nodeKey);
    lines.push(`${root.name}@${root.version}`);
    const children = getChildren(root, depMap);
    for (let j = 0; j < children.length; j++) {
      const child = children[j];
      if (!child) continue;
      walk(child, "", j === children.length - 1);
    }
    visited.delete(nodeKey);
  }

  return lines.join("\n");
}

function renderDot(deps: InstalledDependency[]): string {
  const depMap = buildDepMap(deps);
  const lines: string[] = ['digraph "cppkg-dependencies" {'];
  lines.push("  rankdir=LR;");
  lines.push('  node [shape=box, style=rounded];');

  const edges = new Set<string>();
  for (const dep of deps) {
    const safeName = dep.name.replace(/[^a-zA-Z0-9_]/g, "_");
    lines.push(`  "${safeName}" [label="${dep.name}\\n${dep.version}"];`);
    if (dep.transitiveDeps) {
      for (const childUrl of dep.transitiveDeps) {
        const child = depMap.get(normalizeUrl(childUrl));
        if (child) {
          const childSafe = child.name.replace(/[^a-zA-Z0-9_]/g, "_");
          edges.add(`  "${safeName}" -> "${childSafe}";`);
        }
      }
    }
  }
  for (const edge of edges) {
    lines.push(edge);
  }
  lines.push("}");
  return lines.join("\n");
}

function renderMermaid(deps: InstalledDependency[]): string {
  const depMap = buildDepMap(deps);
  const lines: string[] = ["graph LR;"];
  const edgeSet = new Set<string>();

  for (const dep of deps) {
    const safeName = dep.name.replace(/[^a-zA-Z0-9_]/g, "_");
    lines.push(`  ${safeName}["${dep.name}@${dep.version}"];`);
  }

  for (const dep of deps) {
    const safeName = dep.name.replace(/[^a-zA-Z0-9_]/g, "_");
    if (dep.transitiveDeps) {
      for (const childUrl of dep.transitiveDeps) {
        const child = depMap.get(normalizeUrl(childUrl));
        if (child) {
          const childSafe = child.name.replace(/[^a-zA-Z0-9_]/g, "_");
          const edge = `${safeName} --> ${childSafe}`;
          if (!edgeSet.has(edge)) {
            edgeSet.add(edge);
            lines.push(`  ${edge};`);
          }
        }
      }
    }
  }

  return lines.join("\n");
}

export async function renderDependencyGraph(format: GraphFormat = "ascii"): Promise<string> {
  const installed = await readInstalledDependencies();
  if (!installed.dependencies.length) {
    return "No installed packages found.";
  }

  switch (format) {
    case "dot":
      return renderDot(installed.dependencies);
    case "mermaid":
      return renderMermaid(installed.dependencies);
    default:
      return renderAsciiTree(installed.dependencies);
  }
}
