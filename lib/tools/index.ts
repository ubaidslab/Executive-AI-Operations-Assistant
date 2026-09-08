import { TOOL_SPECS } from "./registry";
import {
  getSchedule,
  listTasks,
  createTask,
  completeTask,
  rescheduleEvent,
  draftEmailReply,
  summarizeDocument,
} from "./executors";

type ToolFn = (args: Record<string, unknown>) => Promise<unknown>;

const EXECUTORS: Record<string, ToolFn> = {
  get_schedule: getSchedule,
  list_tasks: listTasks,
  create_task: createTask,
  complete_task: completeTask,
  reschedule_event: rescheduleEvent,
  draft_email_reply: draftEmailReply,
  summarize_document: summarizeDocument,
};

export async function runTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const fn = EXECUTORS[name];
  if (!fn) {
    const known = TOOL_SPECS.map((t) => t.name).join(", ");
    throw new Error(`Unknown tool "${name}". Known tools: ${known}.`);
  }
  return fn(args);
}

export { TOOL_SPECS };
