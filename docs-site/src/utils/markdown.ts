export type Heading = {
  depth: 2 | 3;
  id: string;
  text: string;
};

export type DocPage = {
  children: Heading[];
  id: string;
  source: string;
  title: string;
};

export function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
      .replace(/\s+/gu, "-") || "section"
  );
}

export function collectHeadings(source: string): Heading[] {
  const headings: Heading[] = [];
  const seen = new Map<string, number>();

  for (const line of source.split("\n")) {
    const match = /^(##|###)\s+(.+)$/u.exec(line);
    if (!match) continue;

    const text = match[2]!.replace(/\s+#+$/u, "").trim();
    const baseId = slugify(text);
    const count = seen.get(baseId) ?? 0;
    const id = count > 0 ? `${baseId}-${count + 1}` : baseId;

    seen.set(baseId, count + 1);

    headings.push({
      depth: match[1] === "##" ? 2 : 3 as const,
      id,
      text,
    });
  }

  return headings;
}

function getUniqueId(text: string, seen: Map<string, number>): string {
  const baseId = slugify(text);
  const count = seen.get(baseId) ?? 0;
  const id = count > 0 ? `${baseId}-${count + 1}` : baseId;
  seen.set(baseId, count + 1);
  return id;
}

export function buildPages(source: string, overviewLabel: string): DocPage[] {
  const pages: DocPage[] = [];
  const seen = new Map<string, number>();
  let currentId = "overview";
  let currentTitle = overviewLabel;
  let currentLines: string[] = [];

  function flushPage() {
    const pageSource = currentLines.join("\n").trim();
    if (!pageSource) return;

    pages.push({
      children: collectHeadings(pageSource).filter((h) => h.depth === 3),
      id: currentId,
      source: pageSource,
      title: currentTitle,
    });
  }

  for (const line of source.split("\n")) {
    const match = /^##\s+(.+)$/u.exec(line);
    if (match) {
      flushPage();
      currentTitle = match[1]!.replace(/\s+#+$/u, "").trim();
      currentId = getUniqueId(currentTitle, seen);
      currentLines = [line];
      continue;
    }
    currentLines.push(line);
  }

  flushPage();
  return pages;
}
