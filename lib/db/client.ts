import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

// Local SQLite file by default — zero external account needed to run this
// project. Point DATABASE_URL at a Turso (libsql://...) database plus
// DATABASE_AUTH_TOKEN for a real deployment.
const url = process.env.DATABASE_URL || "file:./local.db";
const authToken = process.env.DATABASE_AUTH_TOKEN;

const client = createClient({ url, authToken });

export const db = drizzle(client, { schema });
