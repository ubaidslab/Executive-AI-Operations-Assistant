import { generateText, type ChatMessage } from "../ai/generate";
import { TOOL_SPECS, runTool } from "../tools";
import { parseAgentResponse } from "./parse";

const MAX_ITERATIONS = 5;

function buildSystemPrompt(today: string): string {
  const toolList = TOOL_SPECS.map((t) => `- ${t.name}(${t.argsDescription}) — ${t.description}`).join("\n");

  return `You are Atlas, an executive operations assistant. Today's date is ${today}.

You have access to these tools:
${toolList}

To use a tool, respond with ONLY a JSON object, nothing else:
{"tool": "<tool_name>", "args": { ... }}

Once you have enough information to answer the user, respond with ONLY:
{"final": "<your answer to the user, in natural, helpful language>"}

Rules:
- Output exactly one JSON object per turn — no explanation outside the JSON, no markdown.
- Use tools to get real information before answering questions about schedule or tasks — never guess or invent event/task details.
- draft_email_reply and summarize_document only produce text for the user to review; they never send anything or take irreversible action.
- Keep final answers concise and specific — reference actual titles, dates, and names from tool results.`;
}

export interface AgentStep {
  type: "tool_call" | "tool_result" | "final";
  tool?: string;
  args?: Record<string, unknown>;
  result?: unknown;
  text?: string;
}

export interface AgentTurn {
  role: "user" | "assistant";
  content: string;
}

/**
 * A hand-rolled ReAct-style loop rather than a provider's native
 * function-calling API: the model is instructed (via plain system prompt)
 * to emit one structured JSON action per turn, which is parsed, executed
 * against local tools, and fed back as a plain chat message. This makes the
 * loop identical regardless of which provider is behind AI_PROVIDER — it
 * only ever needs "take messages, return text," not a specific vendor's
 * tools/tool_choice API — at the cost of being less robust than a
 * provider's native structured-output guarantees, which parse.ts's
 * defensive parsing exists to absorb.
 */
export async function runAgent(conversation: AgentTurn[]): Promise<{ reply: string; steps: AgentStep[] }> {
  const today = new Date().toISOString().slice(0, 10);
  const steps: AgentStep[] = [];

  const messages: ChatMessage[] = [{ role: "system", content: buildSystemPrompt(today) }, ...conversation];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const raw = await generateText(messages);
    const action = parseAgentResponse(raw);

    if (action.type === "final") {
      steps.push({ type: "final", text: action.text });
      return { reply: action.text, steps };
    }

    steps.push({ type: "tool_call", tool: action.tool, args: action.args });

    let result: unknown;
    try {
      result = await runTool(action.tool, action.args);
    } catch (error) {
      result = { error: error instanceof Error ? error.message : String(error) };
    }
    steps.push({ type: "tool_result", tool: action.tool, result });

    messages.push({ role: "assistant", content: raw });
    messages.push({
      role: "user",
      content: `Tool result for ${action.tool}: ${JSON.stringify(result)}\n\nContinue: call another tool if needed, or respond with {"final": "..."} now.`,
    });
  }

  const fallback =
    "I wasn't able to finish that within my tool-call budget — could you rephrase or split it into a simpler request?";
  steps.push({ type: "final", text: fallback });
  return { reply: fallback, steps };
}
