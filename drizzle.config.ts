import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load .env.local for Next.js projects
config({ path: ".env.local" });

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
