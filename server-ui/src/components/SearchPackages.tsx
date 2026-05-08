import {
  Button,
  Empty,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Tooltip,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  DownloadOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { LANGUAGE_OPTIONS } from "../constants";
import type { PackageActionValues, SearchResult, SearchValues } from "../types";
import { formatDate, formatStars } from "../utils";

type SearchPackagesProps = {
  loadingAction: boolean;
  results: SearchResult[];
  searching: boolean;
  onDownload: (values: PackageActionValues, source?: string) => void;
  onSearch: (values: SearchValues) => void;
};

export default function SearchPackages({
  loadingAction,
  onDownload,
  onSearch,
  results,
  searching,
}: SearchPackagesProps) {
  const columns: ColumnsType<SearchResult> = [
    {
      dataIndex: "repositoryPath",
      render: (repositoryPath: string, item) => (
        <a href={item.repositoryUrl} rel="noreferrer" target="_blank">
          {repositoryPath.replace(/^\/+/, "")}
        </a>
      ),
      title: "Repository",
      width: 260,
    },
    {
      dataIndex: "stars",
      render: formatStars,
      title: "Stars",
      width: 100,
    },
    {
      dataIndex: "language",
      title: "Language",
      width: 120,
    },
    {
      dataIndex: "updatedAt",
      render: formatDate,
      title: "Updated",
      width: 190,
    },
    {
      dataIndex: "description",
      ellipsis: true,
      title: "Description",
    },
    {
      key: "actions",
      render: (_, item) => (
        <Space>
          <Tooltip title="Download package">
            <Button
              aria-label="Download package"
              icon={<DownloadOutlined />}
              loading={loadingAction}
              onClick={() => onDownload({}, item.repositoryUrl)}
              type="primary"
            />
          </Tooltip>
          <Tooltip title="Add to manifest and install">
            <Button
              aria-label="Add to manifest and install"
              icon={<PlusOutlined />}
              loading={loadingAction}
              onClick={() =>
                onDownload(
                  {
                    addToManifest: true,
                    force: true,
                    install: true,
                  },
                  item.repositoryUrl,
                )
              }
            />
          </Tooltip>
        </Space>
      ),
      title: "",
      width: 120,
    },
  ];

  return (
    <section className="tool-panel">
      <Form<SearchValues>
        initialValues={{ language: "C++", limit: 10 }}
        layout="inline"
        onFinish={onSearch}
      >
        <Form.Item
          className="search-query"
          name="query"
          rules={[{ message: "Enter search terms", required: true }]}
        >
          <Input placeholder="json parser" />
        </Form.Item>
        <Form.Item name="language">
          <Select options={LANGUAGE_OPTIONS} popupMatchSelectWidth={false} />
        </Form.Item>
        <Form.Item name="limit">
          <InputNumber max={50} min={1} />
        </Form.Item>
        <Form.Item>
          <Button
            htmlType="submit"
            icon={<SearchOutlined />}
            loading={searching}
            type="primary"
          >
            Search
          </Button>
        </Form.Item>
      </Form>
      <Table
        className="result-table"
        columns={columns}
        dataSource={results}
        loading={searching}
        locale={{
          emptyText: <Empty description="No search results" />,
        }}
        pagination={{ pageSize: 10 }}
        rowKey="repositoryUrl"
        scroll={{ x: 1180 }}
      />
    </section>
  );
}
