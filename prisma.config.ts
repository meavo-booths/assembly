import "dotenv/config";
import { config } from "dotenv";
import { resolve } from "node:path";
import { defineConfig } from "prisma/config";

config({ path: resolve(process.cwd(), ".env.local"), override: true });

const databaseUrl = process.env.DATABASE_URL;

// `prisma generate` never connects to the database, and it runs on every
// `npm install` (postinstall) — including Vercel preview builds where
// DATABASE_URL is not configured. Only fail fast for commands that actually
// connect (db execute, db seed, etc.).
const isGenerate = process.argv.includes("generate");
if (!databaseUrl && !isGenerate) {
  throw new Error(
    "DATABASE_URL is not set. Add it to .env or .env.local (e.g. run: vercel env pull .env.local).",
  );
}

export default defineConfig({
  schema: "node_modules/@meavo/db/prisma/schema.prisma",
  datasource: {
    url: databaseUrl ?? "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
});
