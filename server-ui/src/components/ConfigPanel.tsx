import { useEffect, useState } from "react";
import {
  App as AntApp,
  Button,
  Empty,
  Input,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { DeleteOutlined, ReloadOutlined, SaveOutlined } from "@ant-design/icons";
import { fetchConfig, removeConfigEntry, setConfigEntry } from "../api";
import { CONFIG_KEY_OPTIONS, DEFAULT_CONFIG_STATE } from "../constants";
import type { ConfigEntry, ConfigState } from "../types";

type ConfigPanelProps = { onChanged: () => void };

const { Text } = Typography;

export default function ConfigPanel({ onChanged }: ConfigPanelProps) {
  const { message } = AntApp.useApp();
  const [config, setConfig] = useState<ConfigState>(DEFAULT_CONFIG_STATE);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const loadConfig = async () => {
    setLoading(true);
    try {
      const result = await fetchConfig();
      setConfig(result);
    } catch (error) {
      message.error(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadConfig(); }, []);

  const saveRow = async (key: string) => {
    const value = editValues[key]?.trim();
    if (!value) return;

    setSavingKey(key);
    try {
      const result = await setConfigEntry(key, value);
      setConfig(result);
      setEditValues((prev) => { const next = { ...prev }; delete next[key]; return next; });
      message.success(`${key} saved`);
      onChanged();
    } catch (error) {
      message.error(error instanceof Error ? error.message : String(error));
    } finally {
      setSavingKey(null);
    }
  };

  const removeRow = async (key: string) => {
    setSavingKey(key);
    try {
      const result = await removeConfigEntry(key);
      setConfig(result);
      message.success(`${key} removed`);
      onChanged();
    } catch (error) {
      message.error(error instanceof Error ? error.message : String(error));
    } finally {
      setSavingKey(null);
    }
  };

  const isEditing = (key: string) => key in editValues;

  const columns: ColumnsType<ConfigEntry> = [
    {
      dataIndex: "key",
      title: "Key",
      width: 190,
      render: (key: string) => <Text strong>{key}</Text>,
    },
    {
      dataIndex: "value",
      title: "Value",
      render: (_, entry) =>
        isEditing(entry.key) ? (
          <Input
            autoFocus
            defaultValue={entry.value}
            onChange={(e) => setEditValues((prev) => ({ ...prev, [entry.key]: e.target.value }))}
            onPressEnter={() => void saveRow(entry.key)}
            placeholder="Enter value"
            size="small"
            style={{ maxWidth: 320 }}
          />
        ) : (
          <Text
            code
            editable={{
              onChange: (val) => setEditValues((prev) => ({ ...prev, [entry.key]: val })),
              triggerType: ["text"],
            }}
            style={{ cursor: "pointer" }}
          >
            {entry.value || <Text type="secondary">empty</Text>}
          </Text>
        ),
    },
    {
      dataIndex: "source",
      title: "Source",
      width: 100,
      render: (source: ConfigEntry["source"]) => (
        <Tag color={source === "user" ? "blue" : "default"}>{source}</Tag>
      ),
    },
    {
      key: "actions",
      title: "",
      width: 120,
      render: (_, entry) => (
        <Space size="small">
          {isEditing(entry.key) ? (
            <Button
              icon={<SaveOutlined />}
              loading={savingKey === entry.key}
              onClick={() => void saveRow(entry.key)}
              size="small"
              type="primary"
            />
          ) : entry.source === "user" ? (
            <Button
              disabled={entry.source !== "user"}
              icon={<DeleteOutlined />}
              loading={savingKey === entry.key}
              onClick={() => void removeRow(entry.key)}
              size="small"
            />
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <section className="tool-panel">
      <div className="config-toolbar">
        <Text className="config-path" type="secondary">{config.configFilePath}</Text>
        <Tooltip title="Refresh config">
          <Button aria-label="Refresh config" icon={<ReloadOutlined />} loading={loading} onClick={() => void loadConfig()} />
        </Tooltip>
      </div>
      <Table
        className="result-table"
        columns={columns}
        dataSource={config.entries}
        loading={loading}
        locale={{ emptyText: <Empty description="No config values" /> }}
        pagination={false}
        rowKey="key"
        scroll={{ x: 620 }}
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0}>
              <Text type="secondary" style={{ fontSize: 12 }}>Click a value to edit, or add a new key below:</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={1}>
              <ConfigAddRow onAdded={(result) => { setConfig(result); onChanged(); }} />
            </Table.Summary.Cell>
            <Table.Summary.Cell index={2} />
            <Table.Summary.Cell index={3} />
          </Table.Summary.Row>
        )}
      />
    </section>
  );
}

function ConfigAddRow({ onAdded }: { onAdded: (state: ConfigState) => void }) {
  const { message } = AntApp.useApp();
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!key.trim() || !value.trim()) return;
    setSaving(true);
    try {
      const result = await setConfigEntry(key.trim(), value.trim());
      onAdded(result);
      setKey("");
      setValue("");
      message.success(`${key} saved`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Space.Compact style={{ width: "100%" }}>
      <select
        value={key}
        onChange={(e) => setKey(e.target.value)}
        style={{ width: 160, fontSize: 12, padding: "2px 6px", border: "1px solid #d9d9d9", borderRadius: 4 }}
      >
        <option value="">-- select key --</option>
        {CONFIG_KEY_OPTIONS.filter((o) => !o.disabled).map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <Input
        onChange={(e) => setValue(e.target.value)}
        onPressEnter={() => void handleAdd()}
        placeholder="Value"
        size="small"
        style={{ width: 180 }}
        value={value}
      />
      <Button icon={<SaveOutlined />} loading={saving} onClick={() => void handleAdd()} size="small" type="primary" />
    </Space.Compact>
  );
}
