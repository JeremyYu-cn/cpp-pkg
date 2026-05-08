"use client";

import { App as AntApp, ConfigProvider, theme } from "antd";
import PackageManager from "./components/PackageManager";

export default function CppkgWebApp() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          borderRadius: 6,
          colorPrimary: "#1677ff",
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        },
      }}
    >
      <AntApp>
        <PackageManager />
      </AntApp>
    </ConfigProvider>
  );
}
