import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

console.log(
  "DATABASE_URL starts with:",
  process.env.DATABASE_URL?.substring(0, 30)
);

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });

async function main() {
  try {
    const posts = await sql`SELECT COUNT(*) as count FROM posts`;
    console.log("Posts count:", posts[0].count);

    const sample = await sql`SELECT id, content, language FROM posts LIMIT 5`;
    console.log("Sample posts:", sample);
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await sql.end();
  }
}

main();
