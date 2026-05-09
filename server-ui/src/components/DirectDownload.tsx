import { useRef, useState } from "react";
import { Button, Checkbox, Form, Input, Select, Space } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { inferPackageSource } from "../api";
import { VERSION_POLICIES } from "../constants";
import type { PackageActionValues } from "../types";

type DirectDownloadProps = {
  loading: boolean;
  onSubmit: (values: PackageActionValues) => void;
};

export default function DirectDownload({
  loading,
  onSubmit,
}: DirectDownloadProps) {
  const [form] = Form.useForm<PackageActionValues>();
  const [inferringSource, setInferringSource] = useState(false);
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
      const suggestion = await inferPackageSource(rawSource);

      if (inferenceId !== latestInferenceId.current) {
        return;
      }

      lastInferredSource.current = rawSource;
      form.setFieldValue("source", suggestion.source);
      form.setFieldValue("name", suggestion.name);
      form.setFieldValue("tag", suggestion.tag);
      form.setFieldValue("branch", suggestion.branch);
      form.setFieldValue("versionRange", undefined);
      form.setFieldValue("versionPolicy", undefined);
    } catch {
      if (inferenceId === latestInferenceId.current) {
        lastInferredSource.current = "";
      }
    } finally {
      if (inferenceId === latestInferenceId.current) {
        setInferringSource(false);
      }
    }
  };

  return (
    <section className="tool-panel">
      <Form<PackageActionValues>
        form={form}
        initialValues={{
          addToManifest: false,
          install: true,
        }}
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
              onBlur={(event) => void inferSourceFields(event.target.value)}
              onPaste={(event) =>
                void inferSourceFields(
                  event.clipboardData.getData("text"),
                  true,
                )
              }
              placeholder="github.com/fmtlib/fmt or https://github.com/fmtlib/fmt"
              suffix={inferringSource ? "..." : undefined}
            />
          </Form.Item>
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
          <Button
            htmlType="submit"
            icon={<DownloadOutlined />}
            loading={loading}
            type="primary"
          >
            Run
          </Button>
          <Button onClick={() => form.resetFields()}>Reset</Button>
        </Space>
      </Form>
    </section>
  );
}
