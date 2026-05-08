import React from "react";
import { createRoot } from "react-dom/client";
import "antd/dist/reset.css";
import "./styles.css";
import CppkgWebApp from "./App";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CppkgWebApp />
  </React.StrictMode>,
);
