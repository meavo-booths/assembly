import "dotenv/config";
import { config } from "dotenv";
import { resolve } from "node:path";
import { defineConfig } from "prisma/config";

config({ path: resolve(process.cwd(), ".env.local"), override: true });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Add it to .env or .env.local (e.g. run: vercel env pull .env.local).",
  );
}

export default defineConfig({
  schema: "node_modules/@meavo/db/prisma/schema.prisma",
  datasource: {
    url: databaseUrl,
  },
});
