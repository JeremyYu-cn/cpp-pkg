import React from "react";
import { createRoot } from "react-dom/client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "github-markdown-css/github-markdown-light.css";
import "./styles.css";
import englishMarkdown from "../../README.md?raw";
import chineseMarkdown from "../../docs/README.zh-CN.md?raw";

type Locale = "en" | "zh-CN";
type Theme = "dark" | "light";

const contentByLocale: Record<
  Locale,
  {
    brandLabel: string;
    collapseLabel: string;
    darkThemeLabel: string;
    expandLabel: string;
    languageLabel: string;
    languageUrl: string;
    lightThemeLabel: string;
    markdown: string;
    nextLabel: string;
    overviewLabel: string;
    previousLabel: string;
    sidebarLabel: string;
    themeSwitchLabel: string;
    title: string;
    url: string;
  }
> = {
  en: {
    brandLabel: "User Guide",
    collapseLabel: "Collapse",
    darkThemeLabel: "Switch to dark theme",
    expandLabel: "Expand",
    languageLabel: "中文",
    languageUrl: "./zh-CN.html",
    lightThemeLabel: "Switch to light theme",
    markdown: englishMarkdown,
    nextLabel: "Next",
    overviewLabel: "Overview",
    previousLabel: "Previous",
    sidebarLabel: "Guide navigation",
    themeSwitchLabel: "Theme mode",
    title: "cppkg-cli",
    url: "./index.html",
  },
  "zh-CN": {
    brandLabel: "中文使用指南",
    collapseLabel: "收起",
    darkThemeLabel: "切换到黑夜模式",
    expandLabel: "展开",
    languageLabel: "English",
    languageUrl: "./index.html",
    lightThemeLabel: "切换到白天模式",
    markdown: chineseMarkdown,
    nextLabel: "下一页",
    overviewLabel: "概览",
    previousLabel: "上一页",
    sidebarLabel: "使用指南导航",
    themeSwitchLabel: "主题模式",
    title: "cppkg-cli",
    url: "./zh-CN.html",
  },
};

function getLocale(): Locale {
  return document.documentElement.lang.toLowerCase().startsWith("zh")
    ? "zh-CN"
    : "en";
}

function prepareMarkdown(markdown: string) {
  return markdown.replace(/<p align="center">[\s\S]*?<\/p>\n\n/u, "");
}

type Heading = {
  depth: 2 | 3;
  id: string;
  text: string;
};

type DocPage = {
  children: Heading[];
  id: string;
  source: string;
  title: string;
};

type PageRoute = {
  headingId?: string;
  pageId: string;
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .replace(/\s+/gu, "-") || "section";
}

function collectHeadings(source: string): Heading[] {
  const headings: Heading[] = [];
  const seen = new Map<string, number>();

  for (const line of source.split("\n")) {
    const match = /^(##|###)\s+(.+)$/u.exec(line);

    if (!match) {
      continue;
    }

    const text = match[2]!.replace(/\s+#+$/u, "").trim();
    const baseId = slugify(text);
    const count = seen.get(baseId) ?? 0;
    const id = count > 0 ? `${baseId}-${count + 1}` : baseId;

    seen.set(baseId, count + 1);
    headings.push({
      depth: match[1] === "##" ? 2 : 3,
      id,
      text,
    });
  }

  return headings;
}

function getUniqueId(text: string, seen: Map<string, number>) {
  const baseId = slugify(text);
  const count = seen.get(baseId) ?? 0;
  const id = count > 0 ? `${baseId}-${count + 1}` : baseId;

  seen.set(baseId, count + 1);

  return id;
}

function buildPages(source: string, overviewLabel: string): DocPage[] {
  const pages: DocPage[] = [];
  const seen = new Map<string, number>();
  let currentId = "overview";
  let currentTitle = overviewLabel;
  let currentLines: string[] = [];

  function flushPage() {
    const pageSource = currentLines.join("\n").trim();

    if (!pageSource) {
      return;
    }

    pages.push({
      children: collectHeadings(pageSource).filter(
        (heading) => heading.depth === 3,
      ),
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

function getPageHash(pageId: string, headingId?: string) {
  return `#page/${encodeURIComponent(pageId)}${headingId ? `/${encodeURIComponent(headingId)}` : ""}`;
}

function readPageRoute(pages: DocPage[]): PageRoute | null {
  const match = /^#page\/([^/]+)(?:\/(.+))?$/u.exec(window.location.hash);

  if (!match) {
    return null;
  }

  const pageId = decodeURIComponent(match[1]!);
  const headingId = match[2] ? decodeURIComponent(match[2]) : undefined;

  if (!pages.some((page) => page.id === pageId)) {
    return null;
  }

  return {
    ...(headingId ? { headingId } : {}),
    pageId,
  };
}

function getNodeText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(getNodeText).join("");
  }

  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return getNodeText(node.props.children);
  }

  return "";
}

function H2({
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  const id = slugify(getNodeText(children));

  return (
    <h2 {...props} id={id}>
      <a className="heading-anchor" href={`#${id}`}>
        {children}
      </a>
    </h2>
  );
}

function H3({
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  const id = slugify(getNodeText(children));

  return (
    <h3 {...props} id={id}>
      <a className="heading-anchor" href={`#${id}`}>
        {children}
      </a>
    </h3>
  );
}

function SunIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      {...props}
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function MoonIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      {...props}
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function App() {
  const content = contentByLocale[getLocale()];
  const [theme, setTheme] = React.useState<Theme>(() => {
    const saved = localStorage.getItem("cppkg-docs-theme");

    return saved === "light" ? "light" : "dark";
  });
  const guideMarkdown = prepareMarkdown(content.markdown);
  const pages = React.useMemo(
    () => buildPages(guideMarkdown, content.overviewLabel),
    [content.overviewLabel, guideMarkdown],
  );
  const initialRoute = readPageRoute(pages) ?? {
    pageId: pages[0]?.id ?? "overview",
  };
  const [currentPageId, setCurrentPageId] = React.useState(initialRoute.pageId);
  const [pendingHeadingId, setPendingHeadingId] = React.useState(
    initialRoute.headingId ?? "",
  );
  const [expandedSections, setExpandedSections] = React.useState(
    () => new Set(pages.map((page) => page.id)),
  );
  const currentPageIndex = Math.max(
    0,
    pages.findIndex((page) => page.id === currentPageId),
  );
  const currentPage = pages[currentPageIndex] ?? pages[0]!;
  const previousPage = pages[currentPageIndex - 1];
  const nextPage = pages[currentPageIndex + 1];
  const isDarkTheme = theme === "dark";

  function selectPage(pageId: string, headingId = "") {
    window.history.pushState(null, "", getPageHash(pageId, headingId));
    setCurrentPageId(pageId);
    setPendingHeadingId(headingId);
  }

  function toggleSection(sectionId: string) {
    setExpandedSections((current) => {
      const next = new Set(current);

      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }

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

      if (!route) {
        return;
      }

      setCurrentPageId(route.pageId);
      setPendingHeadingId(route.headingId ?? "");
    }

    window.addEventListener("hashchange", handleHashChange);

    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [pages]);

  React.useEffect(() => {
    if (pendingHeadingId) {
      document.getElementById(pendingHeadingId)?.scrollIntoView({
        block: "start",
      });
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
          <button
            aria-checked={isDarkTheme}
            aria-label={content.themeSwitchLabel}
            className={`theme-switch ${isDarkTheme ? "is-dark" : "is-light"}`}
            onClick={() =>
              setTheme((currentTheme) =>
                currentTheme === "dark" ? "light" : "dark",
              )
            }
            role="switch"
            title={
              isDarkTheme ? content.lightThemeLabel : content.darkThemeLabel
            }
            type="button"
          >
            <span className="theme-switch-track">
              <span className="theme-switch-icon light">
                <SunIcon />
              </span>
              <span className="theme-switch-icon dark">
                <MoonIcon />
              </span>
              <span className="theme-switch-thumb">
                {isDarkTheme ? <MoonIcon /> : <SunIcon />}
              </span>
            </span>
          </button>
        </nav>
      </header>

      <div className="guide-layout">
        <aside className="guide-sidebar" aria-label={content.sidebarLabel}>
          <div className="sidebar-header">
            <div className="sidebar-title">
              <p>{content.sidebarLabel}</p>
            </div>
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
                      onClick={(event) => {
                        event.preventDefault();
                        selectPage(page.id);
                      }}
                    >
                      {page.title}
                    </a>
                    {hasChildren ? (
                      <button
                        aria-expanded={isExpanded}
                        aria-label={`${isExpanded ? content.collapseLabel : content.expandLabel}: ${page.title}`}
                        className="toc-node-toggle"
                        onClick={() => toggleSection(page.id)}
                        type="button"
                      >
                        <span aria-hidden="true">
                          {isExpanded ? "-" : "+"}
                        </span>
                      </button>
                    ) : null}
                  </div>
                  {hasChildren && isExpanded ? (
                    <div className="toc-children">
                      {page.children.map((heading) => (
                        <a
                          className="toc-child"
                          href={getPageHash(page.id, heading.id)}
                          key={heading.id}
                          onClick={(event) => {
                            event.preventDefault();
                            selectPage(page.id, heading.id);
                          }}
                        >
                          {heading.text}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>
        </aside>

        <main className="guide-main">
          <article className="markdown-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h2: H2,
                h3: H3,
              }}
            >
              {currentPage.source}
            </ReactMarkdown>
            <nav className="page-nav" aria-label="Page navigation">
              {previousPage ? (
                <a
                  className="page-nav-link previous"
                  href={getPageHash(previousPage.id)}
                  onClick={(event) => {
                    event.preventDefault();
                    selectPage(previousPage.id);
                  }}
                >
                  <span>{content.previousLabel}</span>
                  <strong>{previousPage.title}</strong>
                </a>
              ) : (
                <span></span>
              )}
              {nextPage ? (
                <a
                  className="page-nav-link next"
                  href={getPageHash(nextPage.id)}
                  onClick={(event) => {
                    event.preventDefault();
                    selectPage(nextPage.id);
                  }}
                >
                  <span>{content.nextLabel}</span>
                  <strong>{nextPage.title}</strong>
                </a>
              ) : (
                <span></span>
              )}
            </nav>
          </article>
        </main>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
