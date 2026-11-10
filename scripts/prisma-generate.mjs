import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

// Local development keeps SQLite (zero config). Production (Firebase /
// Cloud Run) uses PostgreSQL. Prisma fixes the provider inside the schema,
// so for a Postgres DATABASE_URL we generate a deploy schema on the fly.
const url = process.env.DATABASE_URL || "";
const usePostgres =
  /^postgres(ql)?:\/\//i.test(url) || process.env.PRISMA_PROVIDER === "postgresql";

if (usePostgres) {
  const source = readFileSync(path.join("prisma", "schema.prisma"), "utf8");
  const deploy = source.replace('provider = "sqlite"', 'provider = "postgresql"');
  mkdirSync(path.join("prisma", ".deploy"), { recursive: true });
  writeFileSync(path.join("prisma", ".deploy", "schema.prisma"), deploy);
  execSync("npx prisma generate --schema prisma/.deploy/schema.prisma", {
    stdio: "inherit",
    shell: true,
  });
} else {
  execSync("npx prisma generate", { stdio: "inherit", shell: true });
}
