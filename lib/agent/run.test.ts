import { beforeAll, describe, expect, it, vi } from "vitest";

const generateTextMock = vi.fn();
vi.mock("../ai/generate", () => ({
  generateText: (...args: unknown[]) => generateTextMock(...args),
}));

import { runAgent } from "./run";
import { runMigrations } from "../db/migrate";

// Only the LLM call is mocked — parsing, tool execution (against a real
// local SQLite db), and the loop's control flow all run for real. This is
// the part of the project a fresh clone can't exercise live without a real
// AI_PROVIDER key, so it's covered here instead of only by manual testing.

beforeAll(async () => {
  await runMigrations();
});

describe("runAgent", () => {
  it("executes a single tool call and returns the final answer", async () => {
    generateTextMock
      .mockResolvedValueOnce('{"tool": "list_tasks", "args": {"status": "open"}}')
      .mockResolvedValueOnce('{"final": "You have some open tasks."}');

    const result = await runAgent([{ role: "user", content: "What are my open tasks?" }]);

    expect(result.reply).toBe("You have some open tasks.");
    expect(result.steps.map((s) => s.type)).toEqual(["tool_call", "tool_result", "final"]);
    expect(result.steps[0]).toMatchObject({ type: "tool_call", tool: "list_tasks" });
  });

  it("chains multiple tool calls before finishing", async () => {
    generateTextMock
      .mockResolvedValueOnce('{"tool": "create_task", "args": {"title": "Test agent task"}}')
      .mockResolvedValueOnce('{"tool": "list_tasks", "args": {}}')
      .mockResolvedValueOnce('{"final": "Created the task and confirmed it is on the list."}');

    const result = await runAgent([{ role: "user", content: "Add a task and confirm it exists." }]);

    expect(result.reply).toBe("Created the task and confirmed it is on the list.");
    const toolCalls = result.steps.filter((s) => s.type === "tool_call").map((s) => s.tool);
    expect(toolCalls).toEqual(["create_task", "list_tasks"]);

    const createResult = result.steps.find((s) => s.type === "tool_result" && s.tool === "create_task");
    expect(createResult?.result).toMatchObject({ title: "Test agent task" });
  });

  it("surfaces a tool execution error back into the loop instead of crashing", async () => {
    generateTextMock
      .mockResolvedValueOnce('{"tool": "complete_task", "args": {"taskId": "does-not-exist"}}')
      .mockResolvedValueOnce('{"final": "I could not find that task."}');

    const result = await runAgent([{ role: "user", content: "Mark task does-not-exist as done." }]);

    expect(result.reply).toBe("I could not find that task.");
    const toolResultStep = result.steps.find((s) => s.type === "tool_result");
    expect(toolResultStep?.result).toMatchObject({ error: expect.stringContaining("No task found") });
  });

  it("stops after the max iteration budget rather than looping forever", async () => {
    generateTextMock.mockResolvedValue('{"tool": "list_tasks", "args": {}}');

    const result = await runAgent([{ role: "user", content: "loop forever" }]);

    expect(result.reply).toMatch(/tool-call budget/i);
    const toolCallCount = result.steps.filter((s) => s.type === "tool_call").length;
    expect(toolCallCount).toBe(5);
  });

  it("returns a plain final answer when the model skips tool use entirely", async () => {
    generateTextMock.mockResolvedValueOnce('{"final": "Hello! How can I help?"}');

    const result = await runAgent([{ role: "user", content: "hi" }]);

    expect(result.reply).toBe("Hello! How can I help?");
    expect(result.steps).toEqual([{ type: "final", text: "Hello! How can I help?" }]);
  });
});
