import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  // ISO 8601 datetimes (UTC) — kept as plain strings, same simplification
  // rationale as the sibling Kudos project: single-user demo, not worth
  // per-timezone complexity here.
  start: text("start").notNull(),
  end: text("end").notNull(),
  attendees: text("attendees"), // comma-separated, nullable
  location: text("location"),
});

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  dueDate: text("due_date"), // YYYY-MM-DD, nullable
  assignee: text("assignee"), // nullable — unassigned tasks are the exec's own
  status: text("status").notNull().default("open"), // "open" | "done"
  createdAt: text("created_at").notNull(),
});

export const drafts = sqliteTable("drafts", {
  id: text("id").primaryKey(),
  type: text("type").notNull(), // "email_reply" | "document_summary"
  context: text("context").notNull(), // what was fed in
  content: text("content").notNull(), // what the assistant produced
  createdAt: text("created_at").notNull(),
});

export type EventRow = typeof events.$inferSelect;
export type NewEventRow = typeof events.$inferInsert;
export type TaskRow = typeof tasks.$inferSelect;
export type NewTaskRow = typeof tasks.$inferInsert;
export type DraftRow = typeof drafts.$inferSelect;
export type NewDraftRow = typeof drafts.$inferInsert;
