import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
    // lib/agent/run.test.ts runs the agent loop against a real database. An
    // on-disk local.db would be the same file the dev server and any future
    // db:seed script use, persisting across separate test runs with no
    // cleanup step — today's assertions check reply/trace shape rather than
    // exact row counts so accumulation happens to go unnoticed, but that's
    // fragile, not correct (see the sibling Compass project, where the same
    // pattern produced a real nondeterministic ranking-test failure). An
    // in-memory database is created fresh per test file and discarded when
    // the process exits, so state never leaks across runs or files.
    env: {
      DATABASE_URL: "file::memory:",
    },
  },
});
