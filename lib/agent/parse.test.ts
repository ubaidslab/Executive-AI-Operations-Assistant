import { describe, expect, it } from "vitest";
import { parseAgentResponse } from "./parse";

describe("parseAgentResponse", () => {
  it("parses a plain tool-call JSON object", () => {
    const result = parseAgentResponse('{"tool": "get_schedule", "args": {"date": "today"}}');
    expect(result).toEqual({ type: "tool", tool: "get_schedule", args: { date: "today" } });
  });

  it("parses a plain final-answer JSON object", () => {
    const result = parseAgentResponse('{"final": "You have 2 meetings today."}');
    expect(result).toEqual({ type: "final", text: "You have 2 meetings today." });
  });

  it("strips a markdown json code fence around the object", () => {
    const raw = '```json\n{"tool": "list_tasks", "args": {}}\n```';
    expect(parseAgentResponse(raw)).toEqual({ type: "tool", tool: "list_tasks", args: {} });
  });

  it("strips a plain (unlabeled) code fence", () => {
    const raw = '```\n{"final": "Done."}\n```';
    expect(parseAgentResponse(raw)).toEqual({ type: "final", text: "Done." });
  });

  it("defaults args to an empty object when omitted", () => {
    const result = parseAgentResponse('{"tool": "list_tasks"}');
    expect(result).toEqual({ type: "tool", tool: "list_tasks", args: {} });
  });

  it("falls back to treating non-JSON text as a final answer, rather than throwing", () => {
    const result = parseAgentResponse("Sure, you have 2 meetings today and 1 overdue task.");
    expect(result).toEqual({ type: "final", text: "Sure, you have 2 meetings today and 1 overdue task." });
  });

  it("falls back to a final answer for a JSON array (not a valid action shape)", () => {
    const result = parseAgentResponse("[1, 2, 3]");
    expect(result.type).toBe("final");
  });

  it("falls back to a final answer for an object matching neither shape", () => {
    const result = parseAgentResponse('{"hello": "world"}');
    expect(result.type).toBe("final");
  });
});
