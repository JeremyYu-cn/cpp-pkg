import type { DocPage } from "../utils/markdown";
import { getPageHash } from "../utils/routing";

type SidebarProps = {
  pages: DocPage[];
  currentPage: DocPage;
  expandedSections: Set<string>;
  onSelectPage: (pageId: string, headingId?: string) => void;
  onToggleSection: (sectionId: string) => void;
  collapseLabel: string;
  expandLabel: string;
  sidebarLabel: string;
  title: string;
  url: string;
};

export function Sidebar({
  pages, currentPage, expandedSections,
  onSelectPage, onToggleSection,
  collapseLabel, expandLabel, sidebarLabel,
  title, url,
}: SidebarProps) {
  return (
    <aside className="guide-sidebar" aria-label={sidebarLabel}>
      <div className="sidebar-header">
        <a className="sidebar-title" href={url}>
          <strong>{title}</strong>
          <p>{sidebarLabel}</p>
        </a>
      </div>
      <nav className="toc-tree">
        {pages.map((page) => {
          const hasChildren = page.children.length > 0;
          const isExpanded = expandedSections.has(page.id);
          const isCurrent = page.id === currentPage.id;

          return (
            <div className="toc-section" key={page.id}>
              <div className="toc-parent-row">
                <a
                  className={`toc-parent${isCurrent ? " current" : ""}`}
                  href={getPageHash(page.id)}
                  onClick={(e) => { e.preventDefault(); onSelectPage(page.id); }}
                >
                  {page.title}
                </a>
                {hasChildren && (
                  <button
                    aria-expanded={isExpanded}
                    aria-label={`${isExpanded ? collapseLabel : expandLabel}: ${page.title}`}
                    className="toc-node-toggle"
                    onClick={() => onToggleSection(page.id)}
                    type="button"
                  >
                    <span aria-hidden="true">{isExpanded ? "-" : "+"}</span>
                  </button>
                )}
              </div>
              {hasChildren && isExpanded && (
                <div className="toc-children">
                  {page.children.map((heading) => (
                    <a
                      className="toc-child"
                      href={getPageHash(page.id, heading.id)}
                      key={heading.id}
                      onClick={(e) => { e.preventDefault(); onSelectPage(page.id, heading.id); }}
                    >
                      {heading.text}
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
