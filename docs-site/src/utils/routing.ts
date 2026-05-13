import type { DocPage } from "./markdown";

export type PageRoute = {
  headingId?: string;
  pageId: string;
};

export function getPageHash(pageId: string, headingId?: string): string {
  return `#page/${encodeURIComponent(pageId)}${headingId ? `/${encodeURIComponent(headingId)}` : ""}`;
}

export function readPageRoute(pages: DocPage[]): PageRoute | null {
  const match = /^#page\/([^/]+)(?:\/(.+))?$/u.exec(window.location.hash);
  if (!match) return null;

  const pageId = decodeURIComponent(match[1]!);
  const headingId = match[2] ? decodeURIComponent(match[2]) : undefined;

  if (!pages.some((page) => page.id === pageId)) return null;

  return { ...(headingId ? { headingId } : {}), pageId };
}
