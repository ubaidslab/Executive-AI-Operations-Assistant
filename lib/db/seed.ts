import { randomUUID } from "crypto";
import { db } from "./client";
import { runMigrations } from "./migrate";
import { events, tasks } from "./schema";

function isoDateTime(daysFromNow: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
}

function isoDate(daysFromNow: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

async function seed() {
  await runMigrations();
  const now = new Date().toISOString();

  const eventRows = [
    {
      id: randomUUID(),
      title: "Leadership sync",
      start: isoDateTime(0, 10, 0),
      end: isoDateTime(0, 10, 30),
      attendees: "Priya (COO), Marcus (CFO)",
      location: "Conf Room A",
    },
    {
      id: randomUUID(),
      title: "Q3 board deck review",
      start: isoDateTime(0, 14, 0),
      end: isoDateTime(0, 15, 0),
      attendees: "Board prep team",
      location: "Zoom",
    },
    {
      id: randomUUID(),
      title: "1:1 with Sarah (VP Sales)",
      start: isoDateTime(1, 9, 0),
      end: isoDateTime(1, 9, 30),
      attendees: "Sarah Chen",
      location: null,
    },
    {
      id: randomUUID(),
      title: "Investor update call",
      start: isoDateTime(2, 16, 0),
      end: isoDateTime(2, 17, 0),
      attendees: "Investor relations",
      location: "Zoom",
    },
  ];

  const taskRows = [
    {
      id: randomUUID(),
      title: "Review and sign off on Q3 budget",
      dueDate: isoDate(1),
      assignee: null,
      status: "open" as const,
      createdAt: now,
    },
    {
      id: randomUUID(),
      title: "Follow up with legal on the vendor contract",
      dueDate: isoDate(0),
      assignee: "Jordan",
      status: "open" as const,
      createdAt: now,
    },
    {
      id: randomUUID(),
      title: "Approve the new hire offer for the design role",
      dueDate: isoDate(-1),
      assignee: null,
      status: "open" as const,
      createdAt: now,
    },
    {
      id: randomUUID(),
      title: "Send quarterly all-hands agenda",
      dueDate: isoDate(3),
      assignee: "Priya",
      status: "open" as const,
      createdAt: now,
    },
    {
      id: randomUUID(),
      title: "Review last week's board minutes",
      dueDate: isoDate(-3),
      assignee: null,
      status: "done" as const,
      createdAt: now,
    },
  ];

  for (const row of eventRows) {
    await db.insert(events).values(row);
  }
  for (const row of taskRows) {
    await db.insert(tasks).values(row);
  }

  console.log(`Seeded ${eventRows.length} events and ${taskRows.length} tasks.`);
  console.log('Try asking the assistant: "What\'s on my plate today?" or "What tasks are overdue?"');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
