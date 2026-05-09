import { useEffect, useState } from "react";
import {
  App as AntApp,
  Button,
  Layout,
  Space,
  Tabs,
  Tooltip,
  Typography,
} from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { fetchPackages, searchPackages } from "../api";
import { DEFAULT_STATE } from "../constants";
import type {
  SearchResult,
  SearchValues,
  ServerState,
} from "../types";
import usePackageTasks from "../hooks/usePackageTasks";
import { normalizeServerState } from "../state";
import ConfigPanel from "./ConfigPanel";
import DirectDownload from "./DirectDownload";
import InstalledPackagesTable from "./InstalledPackagesTable";
import ManifestTable from "./ManifestTable";
import SearchPackages from "./SearchPackages";
import SummaryGrid from "./SummaryGrid";
import TaskPanel from "./TaskPanel";

const { Content, Header } = Layout;
const { Text, Title } = Typography;

export default function PackageManager() {
  const { message } = AntApp.useApp();
  const [state, setState] = useState<ServerState>(DEFAULT_STATE);
  const normalizedState = normalizeServerState(state);
  const [loadingState, setLoadingState] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const {
    cancelQueuedTask,
    startPackageTask,
    startingTask,
    tasks,
  } = usePackageTasks({
    onError: (errorMessage) => message.error(errorMessage),
    onQueued: () => message.success("Task queued"),
    onStateUpdate: setState,
  });

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
          <Text type="secondary">{normalizedState.cwd || "Current project"}</Text>
        </div>
        <Space>
          <Text type="secondary" className="package-root">
            {normalizedState.packageRoot}
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
        <SummaryGrid state={normalizedState} />
        <Tabs
          defaultActiveKey="installed"
          items={[
            {
              children: (
                <InstalledPackagesTable
                  dependencies={normalizedState.installed}
                  loading={loadingState}
                />
              ),
              key: "installed",
              label: "Installed packages",
            },
            {
              children: (
                <SearchPackages
                  loadingAction={startingTask}
                  onDownload={startPackageTask}
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
                  loading={startingTask}
                  onSubmit={(values) => void startPackageTask(values)}
                />
              ),
              key: "download",
              label: "Direct download",
            },
            {
              children: (
                <ManifestTable
                  dependencies={normalizedState.manifest.dependencies}
                  error={normalizedState.manifest.error}
                  loading={loadingState}
                />
              ),
              key: "manifest",
              label: "Manifest",
            },
            {
              children: <ConfigPanel onChanged={() => void loadPackages()} />,
              key: "config",
              label: "Config",
            },
            {
              children: (
                <TaskPanel
                  onCancel={(taskId) => void cancelQueuedTask(taskId)}
                  tasks={tasks}
                />
              ),
              key: "tasks",
              label: "Tasks",
            },
          ]}
        />
      </Content>
    </Layout>
  );
}
