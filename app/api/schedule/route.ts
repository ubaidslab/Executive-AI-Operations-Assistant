import { NextResponse } from "next/server";
import { runMigrations } from "@/lib/db/migrate";
import { getSchedule } from "@/lib/tools/executors";

export const dynamic = "force-dynamic";

export async function GET() {
  await runMigrations();
  const result = await getSchedule({ date: "today" });
  return NextResponse.json(result);
}
