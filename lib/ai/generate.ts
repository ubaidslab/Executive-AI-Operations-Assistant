export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function readUpstreamError(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return text || res.statusText;
  } catch {
    return res.statusText;
  }
}

/**
 * Same AI_PROVIDER convention as the sibling projects (Cloudflare Workers AI
 * default, OpenAI optional). A single non-streaming call — the agent loop
 * needs the complete response to parse as an action before it can decide
 * what to do next, so there's nothing to stream to mid-generation.
 */
export async function generateText(messages: ChatMessage[]): Promise<string> {
  const provider = (process.env.AI_PROVIDER || "cloudflare").trim().toLowerCase();

  switch (provider) {
    case "cloudflare":
      return generateCloudflare(messages);
    case "openai":
      return generateOpenAI(messages);
    default:
      throw new Error(`Unknown AI_PROVIDER "${provider}". Supported values: "cloudflare", "openai".`);
  }
}

async function generateCloudflare(messages: ChatMessage[]): Promise<string> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiKey = process.env.CLOUDFLARE_API_KEY;
  const model = process.env.CLOUDFLARE_MODEL || "@cf/meta/llama-3.1-8b-instruct";

  if (!accountId || !apiKey) {
    throw new Error(
      "Cloudflare Workers AI is not configured. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_KEY (see .env.example)."
    );
  }

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
    }
  );

  if (!res.ok) {
    throw new Error(`Cloudflare Workers AI request failed (${res.status}): ${await readUpstreamError(res)}`);
  }

  const json = await res.json();
  const text = json?.result?.response;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Cloudflare Workers AI returned an empty response.");
  }
  return text.trim();
}

async function generateOpenAI(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

  if (!apiKey) {
    throw new Error("OpenAI provider is not configured. Set OPENAI_API_KEY (see .env.example).");
  }

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI request failed (${res.status}): ${await readUpstreamError(res)}`);
  }

  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("OpenAI returned an empty response.");
  }
  return text.trim();
}
