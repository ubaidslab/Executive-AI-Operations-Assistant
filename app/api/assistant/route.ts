import { NextRequest, NextResponse } from "next/server";
import { runAgent } from "@/lib/agent/run";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidationError } from "@/lib/validate/types";
import { validateConversation } from "@/lib/validate/conversation";
import { runMigrations } from "@/lib/db/migrate";

export const dynamic = "force-dynamic";

const RATE_LIMIT = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;

function getClientId(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: NextRequest) {
  const clientId = getClientId(req);
  if (!checkRateLimit(clientId, RATE_LIMIT, RATE_LIMIT_WINDOW_MS)) {
    return NextResponse.json(
      { error: "You're sending messages too quickly. Please wait a moment and try again." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const conversation = validateConversation(body);
  if (isValidationError(conversation)) {
    return NextResponse.json({ error: conversation.error }, { status: 400 });
  }

  try {
    await runMigrations();
    const { reply, steps } = await runAgent(conversation);
    return NextResponse.json({ reply, steps });
  } catch (error) {
    console.error("Agent run failed:", error);
    const message = error instanceof Error ? error.message : "Internal server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
