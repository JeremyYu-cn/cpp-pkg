import type { DocPage } from "../utils/markdown";
import { getPageHash } from "../utils/routing";

type PageNavProps = {
  currentPage: DocPage;
  pages: DocPage[];
  onSelectPage: (pageId: string) => void;
  previousLabel: string;
  nextLabel: string;
};

export function PageNav({ currentPage, pages, onSelectPage, previousLabel, nextLabel }: PageNavProps) {
  const currentIndex = Math.max(0, pages.findIndex((p) => p.id === currentPage.id));
  const previous = pages[currentIndex - 1];
  const next = pages[currentIndex + 1];

  return (
    <nav className="page-nav" aria-label="Page navigation">
      {previous ? (
        <a className="page-nav-link previous" href={getPageHash(previous.id)}
          onClick={(e) => { e.preventDefault(); onSelectPage(previous.id); }}>
          <span>{previousLabel}</span>
          <strong>{previous.title}</strong>
        </a>
      ) : <span />}
      {next ? (
        <a className="page-nav-link next" href={getPageHash(next.id)}
          onClick={(e) => { e.preventDefault(); onSelectPage(next.id); }}>
          <span>{nextLabel}</span>
          <strong>{next.title}</strong>
        </a>
      ) : <span />}
    </nav>
  );
}
