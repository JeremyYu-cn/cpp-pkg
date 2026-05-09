import { Button, Empty, Space, Tag, Tooltip, Typography } from "antd";
import { StopOutlined } from "@ant-design/icons";
import type { PackageTask, PackageTaskStatus } from "../types";
import { formatDate } from "../utils";

const { Text } = Typography;

const STATUS_COLORS: Record<PackageTaskStatus, string> = {
  canceled: "default",
  failed: "red",
  queued: "gold",
  running: "blue",
  succeeded: "green",
};

type TaskPanelProps = {
  tasks: PackageTask[];
  onCancel: (taskId: string) => void;
};

function getTaskTime(task: PackageTask) {
  if (task.finishedAt) {
    return formatDate(task.finishedAt);
  }

  if (task.startedAt) {
    return formatDate(task.startedAt);
  }

  return formatDate(task.createdAt);
}

function renderLogs(task: PackageTask) {
  const logs = task.logs.slice(-80);

  if (!logs.length) {
    return <Text type="secondary">No logs yet</Text>;
  }

  return (
    <pre className="task-log">
      {logs.map((log) => (
        <span
          className={log.stream === "stderr" ? "task-log-line error" : "task-log-line"}
          key={`${task.id}-${log.id}`}
        >
          {log.message}
          {"\n"}
        </span>
      ))}
    </pre>
  );
}

export default function TaskPanel({ onCancel, tasks }: TaskPanelProps) {
  if (!tasks.length) {
    return (
      <section className="tool-panel">
        <Empty description="No tasks" />
      </section>
    );
  }

  return (
    <section className="tool-panel">
      <div className="task-list">
        {tasks.map((task) => (
          <div className="task-item" key={task.id}>
            <div className="task-header">
              <Space size="small" wrap>
                <Text strong>{task.label}</Text>
                <Tag color={STATUS_COLORS[task.status]}>{task.status}</Tag>
                <Text type="secondary">#{task.id}</Text>
                <Text type="secondary">{getTaskTime(task)}</Text>
              </Space>
              {task.status === "queued" ? (
                <Tooltip title="Cancel queued task">
                  <Button
                    aria-label="Cancel queued task"
                    icon={<StopOutlined />}
                    onClick={() => onCancel(task.id)}
                  />
                </Tooltip>
              ) : null}
            </div>
            {task.error ? <Text type="danger">{task.error}</Text> : null}
            {renderLogs(task)}
          </div>
        ))}
      </div>
    </section>
  );
}
