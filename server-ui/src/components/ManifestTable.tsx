import { Empty, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { ManifestDependency } from "../types";
import { manifestKey } from "../utils";

const { Text } = Typography;

const columns: ColumnsType<ManifestDependency> = [
  {
    dataIndex: "name",
    render: (name: string | undefined, item) => name || item.source,
    title: "Name",
    width: 180,
  },
  {
    dataIndex: "source",
    render: (source: string) => (
      <a href={source} rel="noreferrer" target="_blank">
        {source}
      </a>
    ),
    title: "Source",
  },
  {
    dataIndex: "tag",
    title: "Tag",
    width: 140,
  },
  {
    dataIndex: "branch",
    title: "Branch",
    width: 140,
  },
  {
    dataIndex: "versionPolicy",
    title: "Policy",
    width: 160,
  },
  {
    dataIndex: "versionRange",
    title: "Range",
    width: 140,
  },
  {
    dataIndex: "fullProject",
    render: (fullProject: boolean | undefined) =>
      fullProject ? <Tag color="geekblue">full project</Tag> : null,
    title: "Install",
    width: 140,
  },
];

type ManifestTableProps = {
  dependencies: ManifestDependency[];
  error?: string;
  loading: boolean;
};

export default function ManifestTable({
  dependencies,
  error,
  loading,
}: ManifestTableProps) {
  return (
    <section className="tool-panel">
      {error ? <Text type="secondary">{error}</Text> : null}
      <Table
        className="result-table"
        columns={columns}
        dataSource={dependencies}
        loading={loading}
        locale={{
          emptyText: <Empty description="No manifest dependencies" />,
        }}
        pagination={false}
        rowKey={manifestKey}
        scroll={{ x: 1100 }}
      />
    </section>
  );
}
