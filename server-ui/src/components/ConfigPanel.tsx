import { useEffect, useState } from "react";
import {
  App as AntApp,
  Button,
  Empty,
  Form,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  DeleteOutlined,
  ReloadOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import {
  fetchConfig,
  removeConfigEntry,
  setConfigEntry,
} from "../api";
import { CONFIG_KEY_OPTIONS, DEFAULT_CONFIG_STATE } from "../constants";
import type { ConfigEntry, ConfigFormValues, ConfigState } from "../types";

type ConfigPanelProps = {
  onChanged: () => void;
};

const { Text } = Typography;

function renderConfigValue(entry: ConfigEntry) {
  if (!entry.value) {
    return <Text type="secondary">empty</Text>;
  }

  return (
    <Text className="config-value" code>
      {entry.value}
    </Text>
  );
}

export default function ConfigPanel({ onChanged }: ConfigPanelProps) {
  const { message } = AntApp.useApp();
  const [form] = Form.useForm<ConfigFormValues>();
  const [config, setConfig] = useState<ConfigState>(DEFAULT_CONFIG_STATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadConfig = async () => {
    setLoading(true);

    try {
      setConfig(await fetchConfig());
    } catch (error) {
      message.error(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConfig();
  }, []);

  const saveConfig = async (values: ConfigFormValues) => {
    setSaving(true);

    try {
      setConfig(await setConfigEntry(values.key, values.value));
      form.resetFields(["value"]);
      message.success("Config saved");
      onChanged();
    } catch (error) {
      message.error(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  const removeConfig = async (key: string) => {
    setSaving(true);

    try {
      setConfig(await removeConfigEntry(key));
      message.success("Config removed");
      onChanged();
    } catch (error) {
      message.error(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<ConfigEntry> = [
    {
      dataIndex: "key",
      title: "Key",
      width: 190,
    },
    {
      dataIndex: "value",
      render: (_, entry) => renderConfigValue(entry),
      title: "Value",
    },
    {
      dataIndex: "source",
      render: (source: ConfigEntry["source"]) => (
        <Tag color={source === "user" ? "blue" : "default"}>{source}</Tag>
      ),
      title: "Source",
      width: 120,
    },
    {
      key: "actions",
      render: (_, entry) => (
        <Tooltip title="Remove override">
          <Button
            aria-label={`Remove ${entry.key}`}
            disabled={entry.source !== "user"}
            icon={<DeleteOutlined />}
            loading={saving}
            onClick={() => void removeConfig(entry.key)}
          />
        </Tooltip>
      ),
      title: "",
      width: 80,
    },
  ];

  return (
    <section className="tool-panel">
      <div className="config-toolbar">
        <Text className="config-path" type="secondary">
          {config.configFilePath}
        </Text>
        <Tooltip title="Refresh config">
          <Button
            aria-label="Refresh config"
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={() => void loadConfig()}
          />
        </Tooltip>
      </div>
      <Form<ConfigFormValues>
        className="config-form"
        form={form}
        layout="inline"
        onFinish={saveConfig}
      >
        <Form.Item
          name="key"
          rules={[{ message: "Select a config key", required: true }]}
        >
          <Select
            className="config-key-select"
            options={CONFIG_KEY_OPTIONS}
            placeholder="Config key"
            popupMatchSelectWidth={false}
            showSearch
          />
        </Form.Item>
        <Form.Item
          name="value"
          rules={[{ message: "Enter a config value", required: true }]}
        >
          <Input className="config-input" placeholder="Value" />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={saving}
              type="primary"
            >
              Save
            </Button>
            <Button onClick={() => form.resetFields()}>Reset</Button>
          </Space>
        </Form.Item>
      </Form>
      <Table
        className="result-table"
        columns={columns}
        dataSource={config.entries}
        loading={loading}
        locale={{
          emptyText: <Empty description="No config values" />,
        }}
        pagination={false}
        rowKey="key"
        scroll={{ x: 760 }}
      />
    </section>
  );
}
