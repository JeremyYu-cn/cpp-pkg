import { useRef, useState } from "react";
import { Button, Card, Checkbox, Descriptions, Form, Input, Select, Space, Tag, Typography } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { inferPackageSource } from "../api";
import { VERSION_POLICIES } from "../constants";
import type { PackageActionValues, SourceFormSuggestion } from "../types";

const { Text } = Typography;

type DirectDownloadProps = {
  loading: boolean;
  onSubmit: (values: PackageActionValues) => void;
};

export default function DirectDownload({ loading, onSubmit }: DirectDownloadProps) {
  const [form] = Form.useForm<PackageActionValues>();
  const [inferringSource, setInferringSource] = useState(false);
  const [suggestion, setSuggestion] = useState<SourceFormSuggestion | null>(null);
  const latestInferenceId = useRef(0);
  const lastInferredSource = useRef("");

  const inferSourceFields = async (source: string, force = false) => {
    const rawSource = source.trim();

    if (!rawSource || (!force && rawSource === lastInferredSource.current)) {
      return;
    }

    const inferenceId = latestInferenceId.current + 1;
    latestInferenceId.current = inferenceId;
    setInferringSource(true);

    try {
      const result = await inferPackageSource(rawSource);

      if (inferenceId !== latestInferenceId.current) return;

      lastInferredSource.current = rawSource;
      setSuggestion(result);
      form.setFieldValue("source", result.source);
      form.setFieldValue("name", result.name);
      form.setFieldValue("tag", result.tag);
      form.setFieldValue("branch", result.branch);
      form.setFieldValue("versionRange", undefined);
      form.setFieldValue("versionPolicy", undefined);
    } catch {
      if (inferenceId === latestInferenceId.current) {
        lastInferredSource.current = "";
        setSuggestion(null);
      }
    } finally {
      if (inferenceId === latestInferenceId.current) {
        setInferringSource(false);
      }
    }
  };

  const handleSourceChange = (value: string) => {
    if (!value.trim()) {
      setSuggestion(null);
    }
  };

  const kindColor: Record<string, string> = {
    "github-repository": "blue",
    "gitee-repository": "cyan",
    "gitlab-repository": "orange",
    "bitbucket-repository": "purple",
    "archive-url": "default",
  };

  return (
    <section className="tool-panel">
      <Form<PackageActionValues>
        form={form}
        initialValues={{ addToManifest: false, install: true }}
        layout="vertical"
        onFinish={onSubmit}
      >
        <div className="form-grid">
          <Form.Item
            className="wide-field"
            label="Package source"
            name="source"
            rules={[{ message: "Enter a package source", required: true }]}
          >
            <Input
              onChange={(e) => handleSourceChange(e.target.value)}
              onBlur={(event) => void inferSourceFields(event.target.value)}
              onPaste={(event) => {
                const text = event.clipboardData.getData("text");
                setTimeout(() => void inferSourceFields(text, true), 0);
              }}
              placeholder="github.com/fmtlib/fmt or https://github.com/fmtlib/fmt"
              suffix={inferringSource ? <Text type="secondary">detecting...</Text> : undefined}
            />
          </Form.Item>
        </div>

        {suggestion && (
          <Card size="small" style={{ marginBottom: 16, background: "#fafafa" }}>
            <Descriptions size="small" column={2} title="Detected package">
              <Descriptions.Item label="Name">
                <Text strong>{suggestion.name}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Source">
                <Tag color={kindColor[suggestion.kind] || "default"}>{suggestion.kind.replace("-", " ")}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="URL">
                <Text code style={{ fontSize: 12 }}>{suggestion.source}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Version">
                {suggestion.tag ? <Tag color="green">tag: {suggestion.tag}</Tag> : suggestion.branch ? <Tag color="geekblue">branch: {suggestion.branch}</Tag> : <Text type="secondary">latest release</Text>}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        <div className="form-grid">
          <Form.Item label="Manifest name" name="name">
            <Input placeholder="fmt" />
          </Form.Item>
          <Form.Item label="Tag" name="tag">
            <Input placeholder="v10.2.1" />
          </Form.Item>
          <Form.Item label="Branch" name="branch">
            <Input placeholder="main" />
          </Form.Item>
          <Form.Item label="Version range" name="versionRange">
            <Input placeholder=">=1.0.0" />
          </Form.Item>
          <Form.Item label="Version policy" name="versionPolicy">
            <Select
              allowClear
              options={VERSION_POLICIES}
              popupMatchSelectWidth={false}
            />
          </Form.Item>
          <Form.Item label="Strip prefix" name="stripPrefix">
            <Input placeholder="source/include" />
          </Form.Item>
          <Form.Item label="Checksum" name="checksum">
            <Input placeholder="sha256 hex digest" />
          </Form.Item>
          <Form.Item className="wide-field" label="Include paths" name="includePath">
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
          </Form.Item>
          <Form.Item className="wide-field" label="Components" name="components">
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
          </Form.Item>
          <Form.Item className="wide-field" label="Patch files" name="patches">
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
          </Form.Item>
        </div>

        <div className="option-row">
          <Form.Item name="fullProject" valuePropName="checked">
            <Checkbox>Full project</Checkbox>
          </Form.Item>
          <Form.Item name="prerelease" valuePropName="checked">
            <Checkbox>Allow prerelease</Checkbox>
          </Form.Item>
          <Form.Item name="noCache" valuePropName="checked">
            <Checkbox>Bypass cache</Checkbox>
          </Form.Item>
          <Form.Item name="addToManifest" valuePropName="checked">
            <Checkbox>Add to manifest</Checkbox>
          </Form.Item>
          <Form.Item name="install" valuePropName="checked">
            <Checkbox>Install after adding</Checkbox>
          </Form.Item>
          <Form.Item name="force" valuePropName="checked">
            <Checkbox>Replace manifest entry</Checkbox>
          </Form.Item>
        </div>

        <Space>
          <Button htmlType="submit" icon={<DownloadOutlined />} loading={loading} type="primary">
            Run
          </Button>
          <Button onClick={() => { form.resetFields(); setSuggestion(null); }}>Reset</Button>
        </Space>
      </Form>
    </section>
  );
}
