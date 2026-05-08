import { useEffect, useState } from "react";
import { App as AntApp, Button, Layout, Space, Tabs, Tooltip, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { fetchPackages, runPackageAction, searchPackages } from "../api";
import { DEFAULT_STATE } from "../constants";
import type {
  PackageActionValues,
  SearchResult,
  SearchValues,
  ServerState,
} from "../types";
import DirectDownload from "./DirectDownload";
import InstalledPackagesTable from "./InstalledPackagesTable";
import ManifestTable from "./ManifestTable";
import SearchPackages from "./SearchPackages";
import SummaryGrid from "./SummaryGrid";

const { Content, Header } = Layout;
const { Text, Title } = Typography;

export default function PackageManager() {
  const { message } = AntApp.useApp();
  const [state, setState] = useState<ServerState>(DEFAULT_STATE);
  const [loadingState, setLoadingState] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [packageActionRunning, setPackageActionRunning] = useState(false);

  const loadPackages = async () => {
    setLoadingState(true);

    try {
      setState(await fetchPackages());
    } catch (error) {
      message.error(error instanceof Error ? error.message : String(error));
    } finally {
      setLoadingState(false);
    }
  };

  useEffect(() => {
    void loadPackages();
  }, []);

  const downloadPackage = async (
    values: PackageActionValues,
    source?: string,
  ) => {
    setPackageActionRunning(true);

    try {
      setState(await runPackageAction(values, source));
      setLoadingState(false);
      message.success(values.addToManifest ? "Manifest updated" : "Package downloaded");
    } catch (error) {
      message.error(error instanceof Error ? error.message : String(error));
    } finally {
      setPackageActionRunning(false);
    }
  };

  const runSearch = async (values: SearchValues) => {
    setSearching(true);

    try {
      setSearchResults(await searchPackages(values));
    } catch (error) {
      message.error(error instanceof Error ? error.message : String(error));
    } finally {
      setSearching(false);
    }
  };

  return (
    <Layout className="app-shell">
      <Header className="app-header">
        <div>
          <Title level={1}>cppkg server</Title>
          <Text type="secondary">{state.cwd || "Current project"}</Text>
        </div>
        <Space>
          <Text type="secondary" className="package-root">
            {state.packageRoot}
          </Text>
          <Tooltip title="Refresh packages">
            <Button
              aria-label="Refresh packages"
              icon={<ReloadOutlined />}
              loading={loadingState}
              onClick={loadPackages}
            />
          </Tooltip>
        </Space>
      </Header>
      <Content className="app-content">
        <SummaryGrid state={state} />
        <Tabs
          defaultActiveKey="installed"
          items={[
            {
              children: (
                <InstalledPackagesTable
                  dependencies={state.installed}
                  loading={loadingState}
                />
              ),
              key: "installed",
              label: "Installed packages",
            },
            {
              children: (
                <SearchPackages
                  loadingAction={packageActionRunning}
                  onDownload={downloadPackage}
                  onSearch={runSearch}
                  results={searchResults}
                  searching={searching}
                />
              ),
              key: "search",
              label: "Search and download",
            },
            {
              children: (
                <DirectDownload
                  loading={packageActionRunning}
                  onSubmit={(values) => void downloadPackage(values)}
                />
              ),
              key: "download",
              label: "Direct download",
            },
            {
              children: (
                <ManifestTable
                  dependencies={state.manifest.dependencies}
                  error={state.manifest.error}
                  loading={loadingState}
                />
              ),
              key: "manifest",
              label: "Manifest",
            },
          ]}
        />
      </Content>
    </Layout>
  );
}
