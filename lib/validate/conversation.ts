import type { ValidationError } from "./types";
import type { AgentTurn } from "../agent/run";

export const MAX_TURNS = 20;
export const MAX_CONTENT_LENGTH = 4000;

/** The one real trust boundary for chat input — reject anything malformed
 * here rather than trusting the client. */
export function validateConversation(body: unknown): AgentTurn[] | ValidationError {
  if (!Array.isArray(body)) {
    return { error: "Request body must be an array of messages." };
  }
  if (body.length === 0) {
    return { error: "At least one message is required." };
  }
  if (body.length > MAX_TURNS) {
    return { error: `Too many messages in one request (max ${MAX_TURNS}).` };
  }

  const turns: AgentTurn[] = [];
  for (const item of body) {
    if (typeof item !== "object" || item === null) {
      return { error: "Each message must be an object with role and content." };
    }
    const { role, content } = item as Record<string, unknown>;

    if (role !== "user" && role !== "assistant") {
      return { error: 'Message "role" must be either "user" or "assistant".' };
    }
    if (typeof content !== "string" || content.trim().length === 0) {
      return { error: 'Message "content" must be a non-empty string.' };
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      return { error: `Message content is too long (max ${MAX_CONTENT_LENGTH} characters).` };
    }

    turns.push({ role, content });
  }

  return turns;
}
