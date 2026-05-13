import englishMarkdown from "../content/en.md?raw";
import chineseMarkdown from "../content/zh-CN.md?raw";

export type Locale = "en" | "zh-CN";

export type LocaleContent = {
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
};

export const contentByLocale: Record<Locale, LocaleContent> = {
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

export function getLocale(): Locale {
  return document.documentElement.lang.toLowerCase().startsWith("zh")
    ? "zh-CN"
    : "en";
}

export function prepareMarkdown(markdown: string) {
  return markdown.replace(/<p align="center">[\s\S]*?<\/p>\n\n/u, "");
}
