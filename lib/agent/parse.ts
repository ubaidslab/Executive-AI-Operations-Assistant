export type AgentAction =
  | { type: "tool"; tool: string; args: Record<string, unknown> }
  | { type: "final"; text: string };

function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

/**
 * Parses the model's raw text output into a structured action. Models
 * reliably ignore "respond with ONLY JSON" often enough that this has to be
 * defensive: it strips markdown code fences the model wraps JSON in despite
 * instructions not to, and if the result still isn't parseable as one of the
 * two expected shapes, treats the raw text as a final answer rather than
 * throwing — a model that "forgets" the JSON contract should still produce
 * a usable reply, not a crash.
 */
export function parseAgentResponse(raw: string): AgentAction {
  const cleaned = stripCodeFence(raw);

  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      if (typeof parsed.final === "string") {
        return { type: "final", text: parsed.final };
      }
      if (typeof parsed.tool === "string") {
        const args = parsed.args && typeof parsed.args === "object" && !Array.isArray(parsed.args) ? parsed.args : {};
        return { type: "tool", tool: parsed.tool, args };
      }
    }
  } catch {
    // Not valid JSON at all — fall through to the final-answer fallback below.
  }

  return { type: "final", text: raw.trim() };
}
