import { randomUUID } from "crypto";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "../db/client";
import { events, tasks, drafts } from "../db/schema";
import { resolveDateKeyword, computeRescheduledEnd } from "./date-utils";
import { generateText } from "../ai/generate";

export async function getSchedule(args: Record<string, unknown>) {
  const date = typeof args.date === "string" ? args.date : "today";
  const today = new Date().toISOString().slice(0, 10);
  const resolved = resolveDateKeyword(date, today);

  const dayStart = `${resolved}T00:00:00.000Z`;
  const dayEnd = `${resolved}T23:59:59.999Z`;

  const rows = await db
    .select()
    .from(events)
    .where(and(gte(events.start, dayStart), lte(events.start, dayEnd)));

  return { date: resolved, events: rows.sort((a, b) => a.start.localeCompare(b.start)) };
}

export async function listTasks(args: Record<string, unknown>) {
  const status = typeof args.status === "string" ? args.status : undefined;
  const today = new Date().toISOString().slice(0, 10);

  const rows = await db.select().from(tasks);

  let filtered = rows;
  if (status === "open") {
    filtered = rows.filter((t) => t.status === "open");
  } else if (status === "done") {
    filtered = rows.filter((t) => t.status === "done");
  } else if (status === "overdue") {
    filtered = rows.filter((t) => t.status === "open" && t.dueDate !== null && t.dueDate < today);
  }

  return { tasks: filtered };
}

export async function createTask(args: Record<string, unknown>) {
  const title = typeof args.title === "string" ? args.title.trim() : "";
  if (!title) throw new Error("title is required to create a task.");
  if (title.length > 200) throw new Error("title must be 200 characters or fewer.");

  const dueDate =
    typeof args.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(args.dueDate) ? args.dueDate : null;
  const assignee =
    typeof args.assignee === "string" && args.assignee.trim() ? args.assignee.trim().slice(0, 100) : null;

  const id = randomUUID();
  await db.insert(tasks).values({ id, title, dueDate, assignee, status: "open", createdAt: new Date().toISOString() });
  return { id, title, dueDate, assignee, status: "open" };
}

export async function completeTask(args: Record<string, unknown>) {
  const taskId = typeof args.taskId === "string" ? args.taskId : "";
  if (!taskId) throw new Error("taskId is required.");

  const existing = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!existing[0]) throw new Error(`No task found with id "${taskId}". Use list_tasks to find the correct id.`);

  await db.update(tasks).set({ status: "done" }).where(eq(tasks.id, taskId));
  return { id: taskId, title: existing[0].title, status: "done" };
}

export async function rescheduleEvent(args: Record<string, unknown>) {
  const eventId = typeof args.eventId === "string" ? args.eventId : "";
  const newStart = typeof args.newStart === "string" ? args.newStart : "";
  if (!eventId) throw new Error("eventId is required.");
  if (!newStart || Number.isNaN(Date.parse(newStart))) {
    throw new Error("newStart must be a valid ISO 8601 datetime.");
  }

  const existing = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!existing[0]) throw new Error(`No event found with id "${eventId}". Use get_schedule to find the correct id.`);

  const newStartIso = new Date(newStart).toISOString();
  const newEnd = computeRescheduledEnd(existing[0].start, existing[0].end, newStartIso);

  await db.update(events).set({ start: newStartIso, end: newEnd }).where(eq(events.id, eventId));
  return { id: eventId, title: existing[0].title, start: newStartIso, end: newEnd };
}

export async function draftEmailReply(args: Record<string, unknown>) {
  const context = typeof args.context === "string" ? args.context.trim() : "";
  const intent = typeof args.intent === "string" ? args.intent.trim() : "";
  if (!context || !intent) throw new Error("Both context and intent are required to draft a reply.");

  const draftText = await generateText([
    {
      role: "system",
      content:
        "You draft professional email replies for an executive. Write only the email body, no subject line, no explanation before or after. Keep it concise and appropriately toned for the context.",
    },
    { role: "user", content: `Original message / context: ${context}\n\nWhat the reply should convey: ${intent}` },
  ]);

  const id = randomUUID();
  await db.insert(drafts).values({
    id,
    type: "email_reply",
    context: `${context}\n---\nIntent: ${intent}`,
    content: draftText,
    createdAt: new Date().toISOString(),
  });

  return { id, draft: draftText };
}

export async function summarizeDocument(args: Record<string, unknown>) {
  const text = typeof args.text === "string" ? args.text.trim() : "";
  if (!text) throw new Error("text is required to summarize.");
  if (text.length > 20000) throw new Error("text is too long (max 20,000 characters) — paste an excerpt instead.");

  const summary = await generateText([
    {
      role: "system",
      content:
        "Summarize the given text in 2-4 sentences, then list concrete action items as a short bullet list (write 'None' if there genuinely aren't any). Be specific, not generic.",
    },
    { role: "user", content: text },
  ]);

  const id = randomUUID();
  await db.insert(drafts).values({
    id,
    type: "document_summary",
    context: text.slice(0, 500),
    content: summary,
    createdAt: new Date().toISOString(),
  });

  return { id, summary };
}
