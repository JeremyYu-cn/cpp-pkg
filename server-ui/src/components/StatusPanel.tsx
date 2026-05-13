import { useEffect, useState } from "react";
import {
  App as AntApp,
  Button,
  Empty,
  Modal,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CheckCircleOutlined,
  ClearOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { cleanPackages, fetchProjectStatus } from "../api";
import type { ProjectStatus, ProjectStatusIssue } from "../types";

const { Text } = Typography;

function getIssueKey(issue: ProjectStatusIssue) {
  return [issue.severity, issue.code, issue.packageName, issue.message].join(":");
}

function countIssues(issues: ProjectStatusIssue[], severity: ProjectStatusIssue["severity"]) {
  return issues.filter((issue) => issue.severity === severity).length;
}

export default function StatusPanel() {
  const { message } = AntApp.useApp();
  const [status, setStatus] = useState<ProjectStatus>({ issues: [] });
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);

  const loadStatus = async () => {
    setLoading(true);
    try {
      setStatus(await fetchProjectStatus());
    } catch (error) {
      message.error(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  const handleClean = async (all: boolean) => {
    setCleaning(true);
    try {
      const result = await cleanPackages(all);
      message.success(`Removed ${result.removed.length} item(s).`);
      await loadStatus();
    } catch (error) {
      message.error(error instanceof Error ? error.message : String(error));
    } finally {
      setCleaning(false);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  const errorCount = countIssues(status.issues, "error");
  const warningCount = countIssues(status.issues, "warn");
  const columns: ColumnsType<ProjectStatusIssue> = [
    {
      dataIndex: "severity",
      render: (severity: ProjectStatusIssue["severity"]) => (
        <Tag color={severity === "error" ? "red" : "orange"}>{severity}</Tag>
      ),
      title: "Severity",
      width: 110,
    },
    {
      dataIndex: "code",
      render: (code: string) => <Text code>{code}</Text>,
      title: "Code",
      width: 170,
    },
    {
      dataIndex: "packageName",
      render: (packageName: string) => packageName || "project",
      title: "Package",
      width: 220,
    },
    {
      dataIndex: "message",
      title: "Message",
    },
  ];

  return (
    <section className="tool-panel">
      <div className="status-toolbar">
        <Space className="status-summary" size={18}>
          <Text strong>{status.issues.length} issue(s)</Text>
          <Text type={errorCount ? "danger" : "secondary"}>{errorCount} error(s)</Text>
          <Text type={warningCount ? "warning" : "secondary"}>{warningCount} warning(s)</Text>
        </Space>
        <Space>
          <Button
            danger
            icon={<ClearOutlined />}
            loading={cleaning}
            onClick={() => {
              Modal.confirm({
                content: "Remove all installed packages and metadata? Use --all to also remove cpp_libs/ and lockfile.",
                okText: "Clean",
                onOk: () => handleClean(false),
                title: "Clean packages",
              });
            }}
          >
            Clean
          </Button>
          <Tooltip title="Refresh status">
            <Button
              aria-label="Refresh status"
              icon={<ReloadOutlined />}
              loading={loading}
              onClick={() => void loadStatus()}
            />
          </Tooltip>
        </Space>
      </div>
      {status.issues.length === 0 && !loading ? (
        <Empty
          description="Project status is clean"
          image={<CheckCircleOutlined className="status-clean-icon" />}
        />
      ) : (
        <Table
          columns={columns}
          dataSource={status.issues}
          loading={loading}
          pagination={false}
          rowKey={getIssueKey}
          scroll={{ x: 860 }}
        />
      )}
    </section>
  );
}
