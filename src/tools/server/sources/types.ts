import type { ResolvedInputSource } from "../../download/types";

export type SourceFormSuggestion = {
  branch?: string;
  kind: ResolvedInputSource["kind"];
  name: string;
  source: string;
  tag?: string;
};

export type VersionSelectionHint = {
  branch?: string;
  tag?: string;
};
