import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "github-markdown-css/github-markdown-light.css";
import "./styles.css";
import { contentByLocale, getLocale, prepareMarkdown, type LocaleContent } from "./content";
import { buildPages, type DocPage } from "./utils/markdown";
import { readPageRoute } from "./utils/routing";
import { ThemeToggle } from "./components/ThemeToggle";
import { H2, H3 } from "./components/Heading";
import { Sidebar } from "./components/Sidebar";
import { PageNav } from "./components/PageNav";

export default function App() {
  const content = contentByLocale[getLocale()];
  const [theme, setTheme] = React.useState<"dark" | "light">(() =>
    localStorage.getItem("cppkg-docs-theme") === "light" ? "light" : "dark",
  );

  const guideMarkdown = prepareMarkdown(content.markdown);
  const pages = React.useMemo(() => buildPages(guideMarkdown, content.overviewLabel), [guideMarkdown, content.overviewLabel]);

  const initialRoute = readPageRoute(pages) ?? { pageId: pages[0]?.id ?? "overview" };
  const [currentPageId, setCurrentPageId] = React.useState(initialRoute.pageId);
  const [pendingHeadingId, setPendingHeadingId] = React.useState(initialRoute.headingId ?? "");
  const [expandedSections, setExpandedSections] = React.useState(() => new Set(pages.map((p) => p.id)));

  const currentIndex = Math.max(0, pages.findIndex((p) => p.id === currentPageId));
  const currentPage = pages[currentIndex] ?? pages[0]!;

  function selectPage(pageId: string, headingId = "") {
    window.history.pushState(null, "", `#page/${encodeURIComponent(pageId)}${headingId ? `/${encodeURIComponent(headingId)}` : ""}`);
    setCurrentPageId(pageId);
    setPendingHeadingId(headingId);
  }

  function toggleSection(id: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  React.useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("cppkg-docs-theme", theme);
  }, [theme]);

  React.useEffect(() => {
    function handleHashChange() {
      const route = readPageRoute(pages);
      if (!route) return;
      setCurrentPageId(route.pageId);
      setPendingHeadingId(route.headingId ?? "");
    }
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [pages]);

  React.useEffect(() => {
    if (pendingHeadingId) {
      document.getElementById(pendingHeadingId)?.scrollIntoView({ block: "start" });
      return;
    }
    window.scrollTo({ top: 0 });
  }, [currentPageId, pendingHeadingId]);

  return (
    <div className="guide-shell">
      <header className="guide-topbar">
        <a className="guide-brand" href={content.url}>
          <img src="./assets/icon.png" alt="" width="36" height="36" />
          <span>
            <strong>{content.title}</strong>
            <small>{content.brandLabel}</small>
          </span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="https://github.com/JeremyYu-cn/cppkg-cli">GitHub</a>
          <a href={content.languageUrl}>{content.languageLabel}</a>
          <ThemeToggle
            isDark={theme === "dark"}
            onToggle={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            lightLabel={content.lightThemeLabel}
            darkLabel={content.darkThemeLabel}
            switchLabel={content.themeSwitchLabel}
          />
        </nav>
      </header>

      <div className="guide-layout">
        <Sidebar
          pages={pages}
          currentPage={currentPage}
          expandedSections={expandedSections}
          onSelectPage={selectPage}
          onToggleSection={toggleSection}
          collapseLabel={content.collapseLabel}
          expandLabel={content.expandLabel}
          sidebarLabel={content.sidebarLabel}
          title={content.title}
          url={content.url}
        />

        <main className="guide-main">
          <article className="markdown-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{ h2: H2, h3: H3 }}
            >
              {currentPage.source}
            </ReactMarkdown>
            <PageNav
              currentPage={currentPage}
              pages={pages}
              onSelectPage={selectPage}
              previousLabel={content.previousLabel}
              nextLabel={content.nextLabel}
            />
          </article>
        </main>
      </div>
    </div>
  );
}
