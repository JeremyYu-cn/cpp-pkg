import React from "react";
import { slugify } from "../utils/markdown";

function getNodeText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getNodeText).join("");
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return getNodeText(node.props.children);
  return "";
}

export function H2({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  const id = slugify(getNodeText(children));
  return <h2 {...props} id={id}><a className="heading-anchor" href={`#${id}`}>{children}</a></h2>;
}

export function H3({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  const id = slugify(getNodeText(children));
  return <h3 {...props} id={id}><a className="heading-anchor" href={`#${id}`}>{children}</a></h3>;
}
