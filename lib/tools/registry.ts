export interface ToolSpec {
  name: string;
  description: string;
  /** Human-readable args shape, embedded directly into the system prompt. */
  argsDescription: string;
}

export const TOOL_SPECS: ToolSpec[] = [
  {
    name: "get_schedule",
    description: "Get calendar events for a specific day.",
    argsDescription: '{"date": "today" | "tomorrow" | "yesterday" | "YYYY-MM-DD"}',
  },
  {
    name: "list_tasks",
    description: "List tasks, optionally filtered by status.",
    argsDescription: '{"status"?: "open" | "done" | "overdue"}',
  },
  {
    name: "create_task",
    description: "Create a new task.",
    argsDescription: '{"title": string, "dueDate"?: "YYYY-MM-DD", "assignee"?: string}',
  },
  {
    name: "complete_task",
    description: "Mark a task done. Use list_tasks first if you don't already have its id.",
    argsDescription: '{"taskId": string}',
  },
  {
    name: "reschedule_event",
    description: "Move an event to a new start time; its duration is preserved automatically.",
    argsDescription: '{"eventId": string, "newStart": "ISO 8601 datetime"}',
  },
  {
    name: "draft_email_reply",
    description: "Draft an email reply for the user to review and send themselves. Never sends anything.",
    argsDescription: '{"context": string, "intent": string}',
  },
  {
    name: "summarize_document",
    description: "Summarize pasted text and extract concrete action items.",
    argsDescription: '{"text": string}',
  },
];
