import { NextResponse } from "next/server";
import { runMigrations } from "@/lib/db/migrate";
import { listTasks } from "@/lib/tools/executors";

export const dynamic = "force-dynamic";

export async function GET() {
  await runMigrations();
  const result = await listTasks({ status: "open" });
  return NextResponse.json(result);
}
