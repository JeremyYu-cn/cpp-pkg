import { Empty, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { InstalledDependency } from "../types";
import { formatDate, packageKey } from "../utils";

const columns: ColumnsType<InstalledDependency> = [
  {
    dataIndex: "name",
    fixed: "left",
    title: "Name",
    width: 160,
  },
  {
    dataIndex: "version",
    title: "Version",
    width: 160,
  },
  {
    dataIndex: ["install", "mode"],
    render: (mode: InstalledDependency["install"]["mode"]) => (
      <Tag color={mode === "include" ? "green" : "geekblue"}>{mode}</Tag>
    ),
    title: "Mode",
    width: 140,
  },
  {
    dataIndex: "type",
    render: (type: InstalledDependency["type"]) => (
      <Tag color={type === "header-only" ? "cyan" : "orange"}>{type}</Tag>
    ),
    title: "Type",
    width: 150,
  },
  {
    dataIndex: "installedAt",
    render: formatDate,
    title: "Installed",
    width: 210,
  },
  {
    dataIndex: ["install", "target"],
    title: "Target",
    width: 220,
  },
  {
    dataIndex: ["repository", "url"],
    render: (url: string, item) => (
      <a href={url} rel="noreferrer" target="_blank">
        {item.repository.path}
      </a>
    ),
    title: "Repository",
    width: 280,
  },
  {
    dataIndex: ["install", "headers"],
    render: (headers: string[]) => headers.join(", "),
    title: "Headers",
    width: 260,
  },
];

type InstalledPackagesTableProps = {
  dependencies: InstalledDependency[];
  loading: boolean;
};

export default function InstalledPackagesTable({
  dependencies,
  loading,
}: InstalledPackagesTableProps) {
  return (
    <Table
      columns={columns}
      dataSource={dependencies}
      loading={loading}
      locale={{
        emptyText: <Empty description="No installed packages" />,
      }}
      pagination={{ pageSize: 10, showSizeChanger: true }}
      rowKey={packageKey}
      scroll={{ x: 1500 }}
      size="middle"
    />
  );
}
