import { useEffect, useState } from "react";
import { App as AntApp, Button, Space, Table, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ReloadOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { fetchOutdatedPackages } from "../api";
import type { OutdatedPackageInfo } from "../types";

const { Text } = Typography;

export default function OutdatedPackages() {
  const { message } = AntApp.useApp();
  const [packages, setPackages] = useState<OutdatedPackageInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOutdated = async () => {
    setLoading(true);
    try {
      const results = await fetchOutdatedPackages();
      setPackages(results as OutdatedPackageInfo[]);
    } catch (error) {
      message.error(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOutdated();
  }, []);

  const columns: ColumnsType<OutdatedPackageInfo> = [
    {
      dataIndex: "name",
      title: "Package",
      width: 200,
    },
    {
      dataIndex: "currentVersion",
      title: "Current",
      width: 150,
    },
    {
      dataIndex: "latestVersion",
      render: (latest: string | undefined, record) =>
        latest ? (
          <Text strong type={record.outdated ? "warning" : undefined}>
            {latest}
          </Text>
        ) : (
          <Text type="secondary">-</Text>
        ),
      title: "Latest",
      width: 150,
    },
    {
      dataIndex: "outdated",
      render: (outdated: boolean) =>
        outdated ? (
          <Text type="warning">Update available</Text>
        ) : (
          <Text type="secondary">
            <CheckCircleOutlined /> Up to date
          </Text>
        ),
      title: "Status",
    },
    {
      dataIndex: "error",
      render: (error: string | undefined) =>
        error ? <Text type="danger">{error}</Text> : null,
      title: "Note",
    },
  ];

  return (
    <section className="tool-panel">
      <div className="status-toolbar">
        <Text strong>{packages.length} package(s) checked</Text>
        <Tooltip title="Check for updates">
          <Button
            aria-label="Check for updates"
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={() => void loadOutdated()}
          />
        </Tooltip>
      </div>
      <Table
        columns={columns}
        dataSource={packages}
        loading={loading}
        pagination={false}
        rowKey="name"
        scroll={{ x: 700 }}
      />
    </section>
  );
}
