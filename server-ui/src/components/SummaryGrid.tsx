import { Typography } from "antd";
import type { ServerState } from "../types";

const { Text } = Typography;

type SummaryGridProps = {
  state: ServerState;
};

export default function SummaryGrid({ state }: SummaryGridProps) {
  return (
    <div className="summary-grid">
      <div className="summary-item">
        <Text type="secondary">Installed</Text>
        <strong>{state.installed.length}</strong>
      </div>
      <div className="summary-item">
        <Text type="secondary">Manifest</Text>
        <strong>{state.manifest.dependencies.length}</strong>
      </div>
      <div className="summary-item">
        <Text type="secondary">Project root</Text>
        <strong>{state.cwd || "-"}</strong>
      </div>
    </div>
  );
}
