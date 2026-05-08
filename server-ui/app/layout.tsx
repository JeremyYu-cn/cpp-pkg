import type { Metadata } from "next";
import type React from "react";
import "antd/dist/reset.css";
import "../src/styles.css";

export const metadata: Metadata = {
  title: "cppkg server",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
